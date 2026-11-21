const { pool } = require('../config/db');
const { config } = require('../config/env');
const { tokenDeReserva, tokenValido } = require('../utils/seguridadReserva');
const { anularPagoYFicha } = require('./pagos.service');

const DURACION_MINUTOS = 5;

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function idValido(valor) {
  const n = Number(valor);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function formatearReserva(r, tokenReserva) {
  const datos = {
    id: r.id_reserva,
    idLugar: r.id_lugar,
    idTarifa: r.id_tarifa,
    monto: r.monto, // PostgreSQL devuelve NUMERIC como texto, sin perder centavos.
    placa: r.placa,
    estado: r.estado,
    fechaInicio: r.fecha_inicio,
    fechaExpiracion: r.fecha_expiracion,
    fechaCierre: r.fecha_cierre,
  };
  if (tokenReserva) datos.tokenReserva = tokenReserva;
  return datos;
}

async function transaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try { await cliente.query('ROLLBACK'); } catch (_) { /* conexión inestable */ }
    throw error;
  } finally {
    cliente.release();
  }
}

// Debe ejecutarse CON la fila de lugar bloqueada (FOR UPDATE).
// La única reserva activa por lugar está garantizada además por el índice parcial.
async function expirarReservaDelLugar(cliente, idLugar) {
  const { rows } = await cliente.query(
    `SELECT id_reserva, fecha_inicio
       FROM reserva
      WHERE id_lugar = $1
        AND estado = 'ACTIVA'
        AND fecha_expiracion <= NOW()
      FOR UPDATE`,
    [idLugar]
  );
  if (!rows.length) return false;

  const reserva = rows[0];
  await cliente.query(
    `UPDATE reserva
        SET estado = 'EXPIRADA', fecha_cierre = NOW()
      WHERE id_reserva = $1 AND estado = 'ACTIVA'`,
    [reserva.id_reserva]
  );
  await cliente.query(
    `UPDATE lugar SET estado = 'LIBRE'
      WHERE id_lugar = $1 AND estado = 'RESERVADO'`,
    [idLugar]
  );
  await cliente.query(
    `INSERT INTO cancelacion
       (id_reserva, tipo, motivo, segundos_transcurridos)
     VALUES ($1, 'EXPIRACION', 'Reserva vencida a los cinco minutos',
       GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - $2::timestamptz)))::int))`,
    [reserva.id_reserva, reserva.fecha_inicio]
  );
  await anularPagoYFicha(cliente, reserva.id_reserva);
  await cliente.query(
    `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
     VALUES ('RESERVA', $1, 'EXPIRACION_AUTOMATICA', 'ACTIVA', 'EXPIRADA'),
            ('LUGAR', $2, 'LIBERACION_POR_EXPIRACION', 'RESERVADO', 'LIBRE')`,
    [reserva.id_reserva, idLugar]
  );
  return true;
}

async function crearReserva(datos) {
  const idLugar = idValido(datos && datos.idLugar);
  if (!idLugar) throw errorHttp(400, 'idLugar debe ser un entero positivo');

  let placa = null;
  if (datos.placa !== undefined && datos.placa !== null && datos.placa !== '') {
    if (typeof datos.placa !== 'string') throw errorHttp(400, 'La placa debe ser texto');
    placa = datos.placa.trim().toUpperCase();
    if (!/^[A-Z0-9 -]{3,15}$/.test(placa)) {
      throw errorHttp(400, 'La placa debe tener de 3 a 15 caracteres válidos');
    }
  }

  return transaccion(async (cliente) => {
    const { rows: lugares } = await cliente.query(
      `SELECT l.id_lugar, l.estado, l.id_sector
         FROM lugar l JOIN sector s ON s.id_sector = l.id_sector
        WHERE l.id_lugar = $1 AND l.activo = TRUE AND s.activo = TRUE
        FOR UPDATE OF l`,
      [idLugar]
    );
    if (!lugares.length) throw errorHttp(404, 'Lugar de parqueo no encontrado');

    const lugar = lugares[0];
    const vencio = await expirarReservaDelLugar(cliente, idLugar);
    if (!vencio && lugar.estado !== 'LIBRE') {
      throw errorHttp(409, 'Este lugar no está disponible');
    }

    const { rows: tarifas } = await cliente.query(
      `SELECT id_tarifa, monto
         FROM tarifa
        WHERE id_sector = $1 AND activo = TRUE
          AND vigente_desde <= NOW()
          AND (vigente_hasta IS NULL OR vigente_hasta > NOW())
        ORDER BY vigente_desde DESC, id_tarifa DESC LIMIT 1`,
      [lugar.id_sector]
    );
    if (!tarifas.length) {
      throw errorHttp(409, 'El sector no tiene una tarifa vigente configurada');
    }

    const tarifa = tarifas[0];
    const { rows } = await cliente.query(
      `INSERT INTO reserva
         (id_lugar, id_tarifa, placa, monto, fecha_inicio, fecha_expiracion, estado)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '5 minutes', 'ACTIVA')
       RETURNING *`,
      [idLugar, tarifa.id_tarifa, placa, tarifa.monto]
    );
    const reserva = rows[0];
    await cliente.query('UPDATE lugar SET estado = $1 WHERE id_lugar = $2', ['RESERVADO', idLugar]);
    await cliente.query(
      `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ('RESERVA', $1, 'CREACION', NULL, 'ACTIVA'),
              ('LUGAR', $2, 'RESERVA_TEMPORAL', 'LIBRE', 'RESERVADO')`,
      [reserva.id_reserva, idLugar]
    );

    const tokenReserva = tokenDeReserva(reserva.id_reserva, reserva.fecha_inicio, config.jwt.secreto);
    return formatearReserva(reserva, tokenReserva);
  });
}

async function obtenerReserva(id, token) {
  const idReserva = idValido(id);
  if (!idReserva) throw errorHttp(400, 'Identificador de reserva inválido');

  const { rows } = await pool.query('SELECT * FROM reserva WHERE id_reserva = $1', [idReserva]);
  if (!rows.length) throw errorHttp(404, 'Reserva no encontrada');
  if (!tokenValido(token, rows[0].id_reserva, rows[0].fecha_inicio, config.jwt.secreto)) {
    throw errorHttp(403, 'Token de reserva inválido o ausente');
  }

  await transaccion(async (cliente) => {
    await cliente.query('SELECT id_lugar FROM lugar WHERE id_lugar = $1 FOR UPDATE', [rows[0].id_lugar]);
    await expirarReservaDelLugar(cliente, rows[0].id_lugar);
  });

  const { rows: actuales } = await pool.query('SELECT * FROM reserva WHERE id_reserva = $1', [idReserva]);
  return formatearReserva(actuales[0]);
}

async function cancelarReserva(id, token) {
  const idReserva = idValido(id);
  if (!idReserva) throw errorHttp(400, 'Identificador de reserva inválido');

  const { rows: consultadas } = await pool.query(
    'SELECT id_reserva, id_lugar, fecha_inicio FROM reserva WHERE id_reserva = $1',
    [idReserva]
  );
  if (!consultadas.length) throw errorHttp(404, 'Reserva no encontrada');
  const previa = consultadas[0];
  if (!tokenValido(token, idReserva, previa.fecha_inicio, config.jwt.secreto)) {
    throw errorHttp(403, 'Token de reserva inválido o ausente');
  }

  return transaccion(async (cliente) => {
    // Orden de bloqueos: lugar -> reserva (igual que la creación y expiración).
    await cliente.query('SELECT id_lugar FROM lugar WHERE id_lugar = $1 FOR UPDATE', [previa.id_lugar]);
    const { rows } = await cliente.query('SELECT * FROM reserva WHERE id_reserva = $1 FOR UPDATE', [idReserva]);
    if (!rows.length) return { codigo: 404, mensaje: 'Reserva no encontrada' };
    const reserva = rows[0];
    if (reserva.estado === 'EXPIRADA') return { codigo: 410, mensaje: 'La reserva está expirada' };
    if (reserva.estado !== 'ACTIVA') {
      return { codigo: 409, mensaje: 'Solo se pueden cancelar reservas activas' };
    }

    const expiro = await expirarReservaDelLugar(cliente, previa.id_lugar);
    if (expiro) return { codigo: 410, mensaje: 'La reserva ya había expirado' };

    // El tiempo se valida en la BD; no confiar en el contador del frontend.
    const { rows: actualizadas } = await cliente.query(
      `UPDATE reserva SET estado = 'CANCELADA', fecha_cierre = NOW()
        WHERE id_reserva = $1 AND estado = 'ACTIVA' AND fecha_expiracion > NOW()
       RETURNING id_reserva`,
      [idReserva]
    );
    if (!actualizadas.length) {
      await expirarReservaDelLugar(cliente, previa.id_lugar);
      return { codigo: 410, mensaje: 'La reserva acaba de expirar' };
    }

    await cliente.query(
      `UPDATE lugar SET estado = 'LIBRE'
        WHERE id_lugar = $1 AND estado = 'RESERVADO'`,
      [reserva.id_lugar]
    );
    await anularPagoYFicha(cliente, reserva.id_reserva);
    await cliente.query(
      `INSERT INTO cancelacion (id_reserva, tipo, motivo, segundos_transcurridos)
       VALUES ($1, 'CONDUCTOR', 'Cancelación voluntaria',
         GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - $2::timestamptz)))::int))`,
      [reserva.id_reserva, reserva.fecha_inicio]
    );
    await cliente.query(
      `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ('RESERVA', $1, 'CANCELACION_CONDUCTOR', 'ACTIVA', 'CANCELADA'),
              ('LUGAR', $2, 'LIBERACION_POR_CANCELACION', 'RESERVADO', 'LIBRE')`,
      [reserva.id_reserva, reserva.id_lugar]
    );
    return { codigo: 200, mensaje: 'Reserva cancelada y lugar liberado', datos: { id: idReserva, estado: 'CANCELADA' } };
  });
}

let ejecutandoExpiraciones = false;
async function expirarReservasPendientes() {
  if (ejecutandoExpiraciones) return 0;
  ejecutandoExpiraciones = true;
  try {
    const { rows } = await pool.query(
      `SELECT id_lugar FROM reserva
        WHERE estado = 'ACTIVA' AND fecha_expiracion <= NOW()
        ORDER BY fecha_expiracion LIMIT 100`
    );
    let total = 0;
    for (const r of rows) {
      const expirado = await transaccion(async (cliente) => {
        await cliente.query('SELECT id_lugar FROM lugar WHERE id_lugar = $1 FOR UPDATE', [r.id_lugar]);
        return expirarReservaDelLugar(cliente, r.id_lugar);
      });
      if (expirado) total++;
    }
    return total;
  } finally {
    ejecutandoExpiraciones = false;
  }
}

module.exports = {
  crearReserva,
  obtenerReserva,
  cancelarReserva,
  expirarReservasPendientes,
  DURACION_MINUTOS,
};
