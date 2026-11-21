const crypto = require('node:crypto');
const { pool } = require('../config/db');
const { config } = require('../config/env');
const { tokenValido } = require('../utils/seguridadReserva');

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function idValido(valor) {
  const n = Number(valor);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
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

// Orden de bloqueos (igual que en reservas): lugar -> reserva -> pago.
async function bloquearReserva(cliente, idReserva, idLugar) {
  await cliente.query('SELECT id_lugar FROM lugar WHERE id_lugar = $1 FOR UPDATE', [idLugar]);
  const { rows } = await cliente.query(
    'SELECT * FROM reserva WHERE id_reserva = $1 FOR UPDATE',
    [idReserva]
  );
  return rows[0];
}

// La reserva debe seguir ACTIVA y dentro de sus 5 minutos (se valida en la BD).
async function reservaVigente(cliente, reserva) {
  if (!reserva) return { codigo: 404, mensaje: 'Reserva no encontrada' };
  if (reserva.estado === 'EXPIRADA') return { codigo: 410, mensaje: 'La reserva está expirada' };
  if (reserva.estado !== 'ACTIVA') {
    return { codigo: 409, mensaje: 'La reserva ya no está activa' };
  }
  const { rows } = await cliente.query('SELECT $1::timestamptz > NOW() AS vigente', [reserva.fecha_expiracion]);
  if (!rows[0].vigente) return { codigo: 410, mensaje: 'La reserva venció; el lugar se libera en segundos' };
  return null;
}

function nuevoCodigoFicha() {
  return `PQ-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

async function emitirFicha(cliente, reserva, idPago) {
  const { rows } = await cliente.query(
    `INSERT INTO ficha (id_reserva, id_pago, codigo_unico)
     VALUES ($1, $2, $3) RETURNING *`,
    [reserva.id_reserva, idPago, nuevoCodigoFicha()]
  );
  const ficha = rows[0];
  // La ficha llega a los encargados activos del sector del lugar (RF-19, RF-23).
  await cliente.query(
    `INSERT INTO notificacion (id_ficha, id_encargado)
     SELECT $1, u.id_usuario
       FROM usuario u JOIN lugar l ON l.id_sector = u.id_sector
      WHERE l.id_lugar = $2 AND u.rol = 'ENCARGADO' AND u.activo = TRUE`,
    [ficha.id_ficha, reserva.id_lugar]
  );
  await cliente.query(
    `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
     VALUES ('FICHA', $1, 'EMISION', NULL, 'EMITIDA')`,
    [ficha.id_ficha]
  );
  return ficha;
}

// Se llama al cancelar o expirar una reserva: la ficha pierde validez y el pago
// pendiente se rechaza, para que nadie pueda presentar una ficha de un lugar liberado.
async function anularPagoYFicha(cliente, idReserva) {
  const { rows: fichas } = await cliente.query(
    `UPDATE ficha SET estado = 'ANULADA'
      WHERE id_reserva = $1 AND estado = 'EMITIDA' RETURNING id_ficha`,
    [idReserva]
  );
  const { rows: pagos } = await cliente.query(
    `UPDATE pago SET estado = 'RECHAZADO'
      WHERE id_reserva = $1 AND estado = 'PENDIENTE' RETURNING id_pago`,
    [idReserva]
  );
  for (const f of fichas) {
    await cliente.query(
      `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ('FICHA', $1, 'ANULACION', 'EMITIDA', 'ANULADA')`,
      [f.id_ficha]
    );
  }
  for (const p of pagos) {
    await cliente.query(
      `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ('PAGO', $1, 'RECHAZO_POR_CIERRE_DE_RESERVA', 'PENDIENTE', 'RECHAZADO')`,
      [p.id_pago]
    );
  }
}

function formatearPago(p) {
  return {
    id: p.id_pago,
    idReserva: p.id_reserva,
    metodo: p.metodo,
    monto: p.monto,
    estado: p.estado,
    fechaPago: p.fecha_pago,
  };
}

function formatearFicha(f) {
  return {
    codigo: f.codigo_unico,
    estado: f.estado,
    fechaEmision: f.fecha_emision,
    sector: f.sector,
    numeroLugar: f.numero_lugar,
    monto: f.monto,
    metodo: f.metodo,
    estadoPago: f.estado_pago,
    placa: f.placa,
  };
}

async function consultarFicha(cliente, idFicha) {
  const { rows } = await cliente.query(
    `SELECT f.codigo_unico, f.estado, f.fecha_emision,
            s.nombre AS sector, l.numero AS numero_lugar,
            p.monto, p.metodo, p.estado AS estado_pago, r.placa
       FROM ficha f
       JOIN pago p ON p.id_pago = f.id_pago
       JOIN reserva r ON r.id_reserva = f.id_reserva
       JOIN lugar l ON l.id_lugar = r.id_lugar
       JOIN sector s ON s.id_sector = l.id_sector
      WHERE f.id_ficha = $1`,
    [idFicha]
  );
  return formatearFicha(rows[0]);
}

async function reservaConToken(id, token) {
  const idReserva = idValido(id);
  if (!idReserva) throw errorHttp(400, 'Identificador de reserva inválido');
  const { rows } = await pool.query(
    'SELECT id_reserva, id_lugar, fecha_inicio FROM reserva WHERE id_reserva = $1',
    [idReserva]
  );
  if (!rows.length) throw errorHttp(404, 'Reserva no encontrada');
  if (!tokenValido(token, idReserva, rows[0].fecha_inicio, config.jwt.secreto)) {
    throw errorHttp(403, 'Token de reserva inválido o ausente');
  }
  return rows[0];
}

// El conductor elige cómo pagar. QR: genera el código y queda PENDIENTE hasta que
// el banco confirme. Efectivo: se emite la ficha de inmediato y el encargado cobra.
async function iniciarPago(id, token, metodo) {
  const metodoNorm = typeof metodo === 'string' ? metodo.trim().toUpperCase() : '';
  if (!['QR', 'EFECTIVO'].includes(metodoNorm)) {
    throw errorHttp(400, 'El método de pago debe ser QR o EFECTIVO');
  }
  const previa = await reservaConToken(id, token);

  return transaccion(async (cliente) => {
    const reserva = await bloquearReserva(cliente, previa.id_reserva, previa.id_lugar);
    const problema = await reservaVigente(cliente, reserva);
    if (problema) return problema;

    const { rows: existentes } = await cliente.query(
      `SELECT * FROM pago WHERE id_reserva = $1 AND estado <> 'RECHAZADO' FOR UPDATE`,
      [reserva.id_reserva]
    );
    const vigente = existentes[0];
    if (vigente) {
      const { rows: conFicha } = await cliente.query('SELECT 1 FROM ficha WHERE id_pago = $1', [vigente.id_pago]);
      if (conFicha.length || vigente.estado === 'CONFIRMADO') {
        return { codigo: 409, mensaje: 'Esta reserva ya tiene un pago y una ficha' };
      }
      if (metodoNorm === 'QR') {
        return {
          codigo: 200,
          mensaje: 'Ya existe un código QR de pago para esta reserva',
          datos: { pago: formatearPago(vigente), codigoQr: vigente.codigo_qr },
        };
      }
      // Cambia de QR a efectivo: el QR pendiente deja de ser válido.
      await cliente.query(`UPDATE pago SET estado = 'RECHAZADO' WHERE id_pago = $1`, [vigente.id_pago]);
      await cliente.query(
        `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
         VALUES ('PAGO', $1, 'CAMBIO_A_EFECTIVO', 'PENDIENTE', 'RECHAZADO')`,
        [vigente.id_pago]
      );
    }

    if (metodoNorm === 'QR') {
      const referencia = crypto.randomBytes(12).toString('hex');
      const codigoQr = `PARQUEO-TARIJA|RESERVA:${reserva.id_reserva}|MONTO:${reserva.monto}BOB|REF:${referencia}`;
      const { rows } = await cliente.query(
        `INSERT INTO pago (id_reserva, metodo, monto, estado, codigo_qr, referencia_pasarela)
         VALUES ($1, 'QR', $2, 'PENDIENTE', $3, $4) RETURNING *`,
        [reserva.id_reserva, reserva.monto, codigoQr, referencia]
      );
      await cliente.query(
        `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
         VALUES ('PAGO', $1, 'CREACION_QR', NULL, 'PENDIENTE')`,
        [rows[0].id_pago]
      );
      return {
        codigo: 201,
        mensaje: 'Código QR generado; paga antes de que termine la reserva',
        datos: { pago: formatearPago(rows[0]), codigoQr, referencia },
      };
    }

    const { rows } = await cliente.query(
      `INSERT INTO pago (id_reserva, metodo, monto, estado)
       VALUES ($1, 'EFECTIVO', $2, 'PENDIENTE') RETURNING *`,
      [reserva.id_reserva, reserva.monto]
    );
    await cliente.query(
      `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ('PAGO', $1, 'CREACION_EFECTIVO', NULL, 'PENDIENTE')`,
      [rows[0].id_pago]
    );
    const ficha = await emitirFicha(cliente, reserva, rows[0].id_pago);
    return {
      codigo: 201,
      mensaje: 'Ficha emitida: paga en efectivo al encargado del sector',
      datos: { pago: formatearPago(rows[0]), ficha: await consultarFicha(cliente, ficha.id_ficha) },
    };
  });
}

// Confirmación del banco/pasarela (simulada con un secreto compartido).
// Es idempotente: confirmar dos veces devuelve la misma ficha.
async function confirmarPagoQr(referencia) {
  if (typeof referencia !== 'string' || !/^[a-f0-9]{24}$/.test(referencia)) {
    throw errorHttp(400, 'Referencia de pago inválida');
  }
  const { rows: encontrados } = await pool.query(
    `SELECT p.id_pago, r.id_reserva, r.id_lugar
       FROM pago p JOIN reserva r ON r.id_reserva = p.id_reserva
      WHERE p.referencia_pasarela = $1 AND p.metodo = 'QR'`,
    [referencia]
  );
  if (!encontrados.length) throw errorHttp(404, 'Pago no encontrado');
  const previo = encontrados[0];

  return transaccion(async (cliente) => {
    const reserva = await bloquearReserva(cliente, previo.id_reserva, previo.id_lugar);
    const { rows } = await cliente.query('SELECT * FROM pago WHERE id_pago = $1 FOR UPDATE', [previo.id_pago]);
    const pago = rows[0];

    if (pago.estado === 'CONFIRMADO') {
      const { rows: f } = await cliente.query('SELECT id_ficha FROM ficha WHERE id_pago = $1', [pago.id_pago]);
      return { codigo: 200, mensaje: 'El pago ya estaba confirmado', datos: { pago: formatearPago(pago), ficha: await consultarFicha(cliente, f[0].id_ficha) } };
    }
    if (pago.estado === 'RECHAZADO') return { codigo: 409, mensaje: 'Este pago fue rechazado' };

    const problema = await reservaVigente(cliente, reserva);
    if (problema) {
      await cliente.query(`UPDATE pago SET estado = 'RECHAZADO' WHERE id_pago = $1`, [pago.id_pago]);
      return { ...problema, mensaje: `${problema.mensaje}. El pago por QR no se aplicó` };
    }

    const { rows: confirmados } = await cliente.query(
      `UPDATE pago SET estado = 'CONFIRMADO', fecha_pago = NOW() WHERE id_pago = $1 RETURNING *`,
      [pago.id_pago]
    );
    await cliente.query(
      `UPDATE reserva SET estado = 'PAGADA', fecha_cierre = NOW() WHERE id_reserva = $1`,
      [reserva.id_reserva]
    );
    await cliente.query(`UPDATE lugar SET estado = 'OCUPADO' WHERE id_lugar = $1`, [reserva.id_lugar]);
    const ficha = await emitirFicha(cliente, reserva, pago.id_pago);
    await cliente.query(
      `INSERT INTO bitacora (entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ('PAGO', $1, 'CONFIRMACION_QR', 'PENDIENTE', 'CONFIRMADO'),
              ('RESERVA', $2, 'PAGO_CONFIRMADO', 'ACTIVA', 'PAGADA'),
              ('LUGAR', $3, 'OCUPADO_POR_PAGO', 'RESERVADO', 'OCUPADO')`,
      [pago.id_pago, reserva.id_reserva, reserva.id_lugar]
    );
    return {
      codigo: 200,
      mensaje: 'Pago confirmado y ficha emitida',
      datos: { pago: formatearPago(confirmados[0]), ficha: await consultarFicha(cliente, ficha.id_ficha) },
    };
  });
}

async function obtenerFichaDeReserva(id, token) {
  const previa = await reservaConToken(id, token);
  const { rows } = await pool.query(
    'SELECT id_ficha FROM ficha WHERE id_reserva = $1',
    [previa.id_reserva]
  );
  if (!rows.length) throw errorHttp(404, 'Esta reserva todavía no tiene ficha');
  return consultarFicha(pool, rows[0].id_ficha);
}

module.exports = { iniciarPago, confirmarPagoQr, obtenerFichaDeReserva, anularPagoYFicha };
