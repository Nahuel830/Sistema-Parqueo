const { pool } = require('../config/db');
const { errorHttp, transaccion, idValido } = require('../utils/http');

const ESTADOS_FICHA = ['EMITIDA', 'VERIFICADA', 'PAGADA', 'ANULADA'];
const CODIGO_FICHA = /^PQ-[A-F0-9]{16}$/;

const SELECT_FICHA = `
  SELECT f.id_ficha, f.codigo_unico, f.estado, f.fecha_emision, f.fecha_verificacion,
         s.nombre AS sector, l.numero AS numero_lugar, r.placa, r.estado AS estado_reserva,
         p.metodo, p.monto, p.estado AS estado_pago, p.fecha_pago
    FROM ficha f
    JOIN pago p ON p.id_pago = f.id_pago
    JOIN reserva r ON r.id_reserva = f.id_reserva
    JOIN lugar l ON l.id_lugar = r.id_lugar
    JOIN sector s ON s.id_sector = l.id_sector`;

function formatearFicha(f) {
  return {
    codigo: f.codigo_unico,
    estado: f.estado,
    fechaEmision: f.fecha_emision,
    fechaVerificacion: f.fecha_verificacion,
    sector: f.sector,
    numeroLugar: f.numero_lugar,
    placa: f.placa,
    monto: f.monto,
    metodo: f.metodo,
    estadoPago: f.estado_pago,
    fechaPago: f.fecha_pago,
    estadoReserva: f.estado_reserva,
  };
}

function codigoValido(codigo) {
  const c = typeof codigo === 'string' ? codigo.trim().toUpperCase() : '';
  if (!CODIGO_FICHA.test(c)) throw errorHttp(400, 'El código de la ficha no es válido');
  return c;
}

// Solo ve fichas de SU sector. Si es de otro sector responde 404 (no revela que existe).
async function contextoFicha(cliente, usuario, codigo) {
  const { rows } = await cliente.query(
    `SELECT f.id_ficha, f.id_reserva, r.id_lugar, l.id_sector
       FROM ficha f JOIN reserva r ON r.id_reserva = f.id_reserva
       JOIN lugar l ON l.id_lugar = r.id_lugar
      WHERE f.codigo_unico = $1`,
    [codigo]
  );
  if (!rows.length || rows[0].id_sector !== usuario.idSector) throw errorHttp(404, 'Ficha no encontrada en tu sector');
  return rows[0];
}

async function fichaPorId(cliente, idFicha) {
  const { rows } = await cliente.query(`${SELECT_FICHA} WHERE f.id_ficha = $1`, [idFicha]);
  return formatearFicha(rows[0]);
}

async function listarLugares(usuario) {
  const { rows } = await pool.query(
    `SELECT s.nombre AS sector, l.id_lugar, l.numero, l.estado
       FROM lugar l JOIN sector s ON s.id_sector = l.id_sector
      WHERE l.id_sector = $1 AND l.activo = TRUE ORDER BY l.numero`,
    [usuario.idSector]
  );
  return { sector: rows[0] ? rows[0].sector : null, lugares: rows.map((l) => ({ id: l.id_lugar, numero: l.numero, estado: l.estado })) };
}

// Por defecto devuelve las fichas de hoy (hora de Bolivia). ?fecha=AAAA-MM-DD o ?fecha=todas.
async function listarFichas(usuario, { estado, fecha } = {}) {
  const params = [usuario.idSector];
  let filtros = '';
  if (estado !== undefined && estado !== '') {
    const e = String(estado).toUpperCase();
    if (!ESTADOS_FICHA.includes(e)) throw errorHttp(400, `El estado debe ser uno de: ${ESTADOS_FICHA.join(', ')}`);
    params.push(e);
    filtros += ` AND f.estado = $${params.length}`;
  }
  if (fecha !== 'todas') {
    if (fecha !== undefined && fecha !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw errorHttp(400, 'La fecha debe tener el formato AAAA-MM-DD o ser "todas"');
    }
    if (fecha) {
      params.push(fecha);
      filtros += ` AND (f.fecha_emision AT TIME ZONE 'America/La_Paz')::date = $${params.length}::date`;
    } else {
      filtros += ` AND (f.fecha_emision AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date`;
    }
  }
  const { rows } = await pool.query(
    `${SELECT_FICHA} WHERE l.id_sector = $1${filtros} ORDER BY f.fecha_emision DESC LIMIT 200`,
    params
  );
  return rows.map(formatearFicha);
}

async function obtenerFicha(usuario, codigoCrudo) {
  const codigo = codigoValido(codigoCrudo);
  const ctx = await contextoFicha(pool, usuario, codigo);
  return fichaPorId(pool, ctx.id_ficha);
}

// RF-22: el encargado cobra el efectivo en el lugar. Recién entonces el lugar queda ocupado.
async function cobrarEfectivo(usuario, codigoCrudo) {
  const codigo = codigoValido(codigoCrudo);
  return transaccion(async (cliente) => {
    const ctx = await contextoFicha(cliente, usuario, codigo);
    // Orden de bloqueos: lugar -> reserva -> pago -> ficha.
    await cliente.query('SELECT id_lugar FROM lugar WHERE id_lugar = $1 FOR UPDATE', [ctx.id_lugar]);
    const { rows: res } = await cliente.query('SELECT * FROM reserva WHERE id_reserva = $1 FOR UPDATE', [ctx.id_reserva]);
    const reserva = res[0];
    const { rows: fi } = await cliente.query('SELECT * FROM ficha WHERE id_ficha = $1 FOR UPDATE', [ctx.id_ficha]);
    const ficha = fi[0];
    const { rows: pa } = await cliente.query('SELECT * FROM pago WHERE id_pago = $1 FOR UPDATE', [ficha.id_pago]);
    const pago = pa[0];

    if (ficha.estado === 'ANULADA') return { codigo: 410, mensaje: 'La ficha fue anulada (la reserva venció o se canceló)' };
    if (pago.metodo !== 'EFECTIVO') return { codigo: 409, mensaje: 'Esta ficha se pagó por QR; no hay efectivo que cobrar' };
    if (pago.estado === 'CONFIRMADO') return { codigo: 409, mensaje: 'El cobro en efectivo ya fue registrado' };
    if (pago.estado !== 'PENDIENTE' || reserva.estado !== 'ACTIVA') return { codigo: 409, mensaje: 'Esta ficha ya no se puede cobrar' };
    const { rows: vig } = await cliente.query('SELECT $1::timestamptz > NOW() AS vigente', [reserva.fecha_expiracion]);
    if (!vig[0].vigente) return { codigo: 410, mensaje: 'La reserva venció; el lugar se libera en segundos' };

    await cliente.query(
      `UPDATE pago SET estado = 'CONFIRMADO', fecha_pago = NOW(), id_encargado = $2 WHERE id_pago = $1`,
      [pago.id_pago, usuario.id]
    );
    await cliente.query(`UPDATE reserva SET estado = 'PAGADA', fecha_cierre = NOW() WHERE id_reserva = $1`, [reserva.id_reserva]);
    await cliente.query(`UPDATE lugar SET estado = 'OCUPADO' WHERE id_lugar = $1`, [reserva.id_lugar]);
    await cliente.query(
      `INSERT INTO bitacora (id_usuario, entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ($1, 'PAGO', $2, 'COBRO_EFECTIVO', 'PENDIENTE', 'CONFIRMADO'),
              ($1, 'RESERVA', $3, 'PAGO_CONFIRMADO', 'ACTIVA', 'PAGADA'),
              ($1, 'LUGAR', $4, 'OCUPADO_POR_PAGO', 'RESERVADO', 'OCUPADO')`,
      [usuario.id, pago.id_pago, reserva.id_reserva, reserva.id_lugar]
    );
    return { codigo: 200, mensaje: 'Cobro en efectivo registrado', datos: await fichaPorId(cliente, ficha.id_ficha) };
  });
}

// Cambia el estado de la ficha respetando el orden EMITIDA -> VERIFICADA -> PAGADA.
async function avanzarFicha(usuario, codigoCrudo, { desde, hacia, accion, exigePagoConfirmado }) {
  const codigo = codigoValido(codigoCrudo);
  return transaccion(async (cliente) => {
    const ctx = await contextoFicha(cliente, usuario, codigo);
    await cliente.query('SELECT id_lugar FROM lugar WHERE id_lugar = $1 FOR UPDATE', [ctx.id_lugar]);
    const { rows: fi } = await cliente.query('SELECT * FROM ficha WHERE id_ficha = $1 FOR UPDATE', [ctx.id_ficha]);
    const ficha = fi[0];
    const { rows: pa } = await cliente.query('SELECT * FROM pago WHERE id_pago = $1', [ficha.id_pago]);

    if (ficha.estado === 'ANULADA') return { codigo: 410, mensaje: 'La ficha fue anulada (la reserva venció o se canceló)' };
    if (ficha.estado !== desde) return { codigo: 409, mensaje: `La ficha está en estado ${ficha.estado}; se esperaba ${desde}` };
    if (exigePagoConfirmado && pa[0].estado !== 'CONFIRMADO') {
      return { codigo: 409, mensaje: 'Primero registra el cobro en efectivo' };
    }
    await cliente.query(
      `UPDATE ficha SET estado = $2, id_encargado_verifica = $3,
              fecha_verificacion = COALESCE(fecha_verificacion, NOW())
        WHERE id_ficha = $1`,
      [ficha.id_ficha, hacia, usuario.id]
    );
    await cliente.query(
      `INSERT INTO bitacora (id_usuario, entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ($1, 'FICHA', $2, $3, $4, $5)`,
      [usuario.id, ficha.id_ficha, accion, desde, hacia]
    );
    return { codigo: 200, mensaje: accion === 'VERIFICACION' ? 'Ficha verificada' : 'Ficha marcada como pagada', datos: await fichaPorId(cliente, ficha.id_ficha) };
  });
}

const verificarFicha = (usuario, codigo) =>
  avanzarFicha(usuario, codigo, { desde: 'EMITIDA', hacia: 'VERIFICADA', accion: 'VERIFICACION', exigePagoConfirmado: true });

const marcarFichaPagada = (usuario, codigo) =>
  avanzarFicha(usuario, codigo, { desde: 'VERIFICADA', hacia: 'PAGADA', accion: 'MARCADA_PAGADA', exigePagoConfirmado: true });

async function listarNotificaciones(usuario, { soloNoLeidas } = {}) {
  const { rows } = await pool.query(
    `SELECT n.id_notificacion, n.fecha_envio, n.leida, f.codigo_unico, f.estado AS estado_ficha,
            s.nombre AS sector, l.numero AS numero_lugar
       FROM notificacion n
       JOIN ficha f ON f.id_ficha = n.id_ficha
       JOIN reserva r ON r.id_reserva = f.id_reserva
       JOIN lugar l ON l.id_lugar = r.id_lugar
       JOIN sector s ON s.id_sector = l.id_sector
      WHERE n.id_encargado = $1 ${soloNoLeidas ? 'AND n.leida = FALSE' : ''}
      ORDER BY n.fecha_envio DESC LIMIT 100`,
    [usuario.id]
  );
  return rows.map((n) => ({
    id: n.id_notificacion, fechaEnvio: n.fecha_envio, leida: n.leida,
    codigoFicha: n.codigo_unico, estadoFicha: n.estado_ficha, sector: n.sector, numeroLugar: n.numero_lugar,
  }));
}

async function marcarNotificacionLeida(usuario, id) {
  const idNot = idValido(id);
  if (!idNot) throw errorHttp(400, 'Identificador de notificación inválido');
  const { rowCount } = await pool.query(
    'UPDATE notificacion SET leida = TRUE WHERE id_notificacion = $1 AND id_encargado = $2',
    [idNot, usuario.id]
  );
  if (!rowCount) throw errorHttp(404, 'Notificación no encontrada');
  return { id: idNot, leida: true };
}

module.exports = {
  listarLugares, listarFichas, obtenerFicha, cobrarEfectivo, verificarFicha,
  marcarFichaPagada, listarNotificaciones, marcarNotificacionLeida,
};
