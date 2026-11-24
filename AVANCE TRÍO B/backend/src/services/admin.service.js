const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { config } = require('../config/env');
const { errorHttp, transaccion, idValido } = require('../utils/http');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TZ = 'America/La_Paz';

// Arma el WHERE de los listados: fechas en hora de Bolivia (inclusive) y filtros por sector, tipo o método.
function filtros(columnaFecha, { desde, hasta, idSector, extra }) {
  const params = [];
  const cond = [];
  for (const [valor, op, nombre] of [[desde, '>=', 'desde'], [hasta, '<=', 'hasta']]) {
    if (valor === undefined || valor === '') continue;
    if (!FECHA.test(valor)) throw errorHttp(400, `"${nombre}" debe tener el formato AAAA-MM-DD`);
    params.push(valor);
    cond.push(`(${columnaFecha} AT TIME ZONE '${TZ}')::date ${op} $${params.length}::date`);
  }
  if (idSector !== undefined && idSector !== '') {
    const id = idValido(idSector);
    if (!id) throw errorHttp(400, 'idSector debe ser un entero positivo');
    params.push(id);
    cond.push(`l.id_sector = $${params.length}`);
  }
  if (extra && extra.valor !== undefined && extra.valor !== '') {
    const v = String(extra.valor).toUpperCase();
    if (!extra.permitidos.includes(v)) throw errorHttp(400, `${extra.nombre} debe ser uno de: ${extra.permitidos.join(', ')}`);
    params.push(v);
    cond.push(`${extra.columna} = $${params.length}`);
  }
  return { donde: cond.length ? `WHERE ${cond.join(' AND ')}` : '', params };
}

async function listarLugares() {
  const { rows } = await pool.query(
    `SELECT s.id_sector, s.nombre AS sector, l.id_lugar, l.numero, l.estado
       FROM lugar l JOIN sector s ON s.id_sector = l.id_sector
      WHERE l.activo = TRUE ORDER BY s.id_sector, l.numero`
  );
  return rows.map((r) => ({ idSector: r.id_sector, sector: r.sector, id: r.id_lugar, numero: r.numero, estado: r.estado }));
}

// RF-31 y RF-32
async function listarCancelaciones(q) {
  const { donde, params } = filtros('c.fecha_cancelacion', {
    ...q, extra: { valor: q.tipo, nombre: 'tipo', columna: 'c.tipo', permitidos: ['CONDUCTOR', 'EXPIRACION'] },
  });
  const { rows } = await pool.query(
    `SELECT c.id_cancelacion, c.tipo, c.motivo, c.fecha_cancelacion, c.segundos_transcurridos,
            r.id_reserva, r.placa, r.monto, s.nombre AS sector, l.numero AS numero_lugar
       FROM cancelacion c
       JOIN reserva r ON r.id_reserva = c.id_reserva
       JOIN lugar l ON l.id_lugar = r.id_lugar
       JOIN sector s ON s.id_sector = l.id_sector
       ${donde} ORDER BY c.fecha_cancelacion DESC LIMIT 500`,
    params
  );
  return rows.map((r) => ({
    id: r.id_cancelacion, tipo: r.tipo, motivo: r.motivo, fecha: r.fecha_cancelacion,
    segundosTranscurridos: r.segundos_transcurridos, idReserva: r.id_reserva, placa: r.placa,
    monto: r.monto, sector: r.sector, numeroLugar: r.numero_lugar,
  }));
}

// RF-33
async function listarPagos(q) {
  const { donde, params } = filtros('COALESCE(p.fecha_pago, f.fecha_emision, r.fecha_inicio)', {
    ...q, extra: { valor: q.metodo, nombre: 'metodo', columna: 'p.metodo', permitidos: ['QR', 'EFECTIVO'] },
  });
  const { rows } = await pool.query(
    `SELECT p.id_pago, p.metodo, p.monto, p.estado, p.fecha_pago, f.codigo_unico, f.estado AS estado_ficha,
            s.nombre AS sector, l.numero AS numero_lugar, u.nombre_completo AS cobrado_por
       FROM pago p
       JOIN reserva r ON r.id_reserva = p.id_reserva
       JOIN lugar l ON l.id_lugar = r.id_lugar
       JOIN sector s ON s.id_sector = l.id_sector
       LEFT JOIN ficha f ON f.id_pago = p.id_pago
       LEFT JOIN usuario u ON u.id_usuario = p.id_encargado
       ${donde} ORDER BY p.id_pago DESC LIMIT 500`,
    params
  );
  return rows.map((r) => ({
    id: r.id_pago, metodo: r.metodo, monto: r.monto, estado: r.estado, fechaPago: r.fecha_pago,
    codigoFicha: r.codigo_unico, estadoFicha: r.estado_ficha, sector: r.sector, numeroLugar: r.numero_lugar, cobradoPor: r.cobrado_por,
  }));
}

// RF-34: ingresos, ocupación y cobros QR vs efectivo (la exportación a PDF/Excel queda pendiente).
async function resumen(q) {
  const { donde, params } = filtros('p.fecha_pago', q);
  const { rows: ingresos } = await pool.query(
    `SELECT s.nombre AS sector, p.metodo, COUNT(*)::int AS cantidad, COALESCE(SUM(p.monto), 0) AS total
       FROM pago p JOIN reserva r ON r.id_reserva = p.id_reserva
       JOIN lugar l ON l.id_lugar = r.id_lugar JOIN sector s ON s.id_sector = l.id_sector
       ${donde ? `${donde} AND` : 'WHERE'} p.estado = 'CONFIRMADO'
      GROUP BY s.nombre, p.metodo ORDER BY s.nombre, p.metodo`,
    params
  );
  const { rows: ocupacion } = await pool.query(
    `SELECT s.nombre AS sector, l.estado, COUNT(*)::int AS cantidad
       FROM lugar l JOIN sector s ON s.id_sector = l.id_sector
      WHERE l.activo = TRUE GROUP BY s.nombre, l.estado ORDER BY s.nombre, l.estado`
  );
  const fil = filtros('c.fecha_cancelacion', q);
  const { rows: cancelaciones } = await pool.query(
    `SELECT c.tipo, COUNT(*)::int AS cantidad
       FROM cancelacion c JOIN reserva r ON r.id_reserva = c.id_reserva JOIN lugar l ON l.id_lugar = r.id_lugar
       ${fil.donde} GROUP BY c.tipo ORDER BY c.tipo`,
    fil.params
  );
  const totalCobrado = ingresos.reduce((a, r) => a + Number(r.total), 0);
  return {
    totalCobrado: totalCobrado.toFixed(2),
    ingresosPorSectorYMetodo: ingresos.map((r) => ({ sector: r.sector, metodo: r.metodo, cantidad: r.cantidad, total: r.total })),
    ocupacionActual: ocupacion.map((r) => ({ sector: r.sector, estado: r.estado, cantidad: r.cantidad })),
    cancelacionesPorTipo: cancelaciones,
  };
}

// RF-28
async function listarTarifas() {
  const { rows } = await pool.query(
    `SELECT t.id_tarifa, t.id_sector, s.nombre AS sector, t.monto, t.vigente_desde
       FROM tarifa t JOIN sector s ON s.id_sector = t.id_sector
      WHERE t.activo = TRUE AND t.vigente_hasta IS NULL ORDER BY s.id_sector`
  );
  return rows.map((t) => ({ id: t.id_tarifa, idSector: t.id_sector, sector: t.sector, monto: t.monto, vigenteDesde: t.vigente_desde }));
}

// La tarifa anterior se cierra y se crea una nueva. Las reservas ya hechas conservan el monto que tenían.
async function cambiarTarifa(admin, idSectorCrudo, montoCrudo) {
  const idSector = idValido(idSectorCrudo);
  if (!idSector) throw errorHttp(400, 'idSector debe ser un entero positivo');
  const texto = String(montoCrudo === undefined ? '' : montoCrudo).trim();
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(texto) || Number(texto) <= 0) {
    throw errorHttp(400, 'El monto debe ser mayor que 0, con hasta 2 decimales y máximo 9999.99');
  }
  return transaccion(async (cliente) => {
    const { rows: sec } = await cliente.query('SELECT id_sector FROM sector WHERE id_sector = $1 AND activo = TRUE FOR UPDATE', [idSector]);
    if (!sec.length) throw errorHttp(404, 'Sector no encontrado');
    await cliente.query(
      `UPDATE tarifa SET vigente_hasta = NOW(), activo = FALSE WHERE id_sector = $1 AND activo = TRUE`,
      [idSector]
    );
    const { rows } = await cliente.query(
      `INSERT INTO tarifa (id_sector, monto, activo) VALUES ($1, $2, TRUE) RETURNING id_tarifa, monto, vigente_desde`,
      [idSector, texto]
    );
    await cliente.query(
      `INSERT INTO bitacora (id_usuario, entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ($1, 'TARIFA', $2, 'CAMBIO_DE_TARIFA', NULL, $3)`,
      [admin.id, rows[0].id_tarifa, `Bs ${texto}`]
    );
    return { id: rows[0].id_tarifa, idSector, monto: rows[0].monto, vigenteDesde: rows[0].vigente_desde };
  });
}

// ----- Encargados (RF-29 y RF-30) -----
function validarContrasena(c) {
  if (typeof c !== 'string' || c.length < 8 || c.length > 72 || !/[A-Za-z]/.test(c) || !/\d/.test(c)) {
    throw errorHttp(400, 'La contraseña debe tener de 8 a 72 caracteres, con letras y números');
  }
}
function validarTexto(valor, campo, max) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max) {
    throw errorHttp(400, `${campo} es obligatorio (máximo ${max} caracteres)`);
  }
  return valor.trim();
}
const formatearEncargado = (u) => ({ id: u.id_usuario, nombre: u.nombre_completo, username: u.username, idSector: u.id_sector, sector: u.sector, activo: u.activo });

async function listarEncargados() {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.nombre_completo, u.username, u.id_sector, s.nombre AS sector, u.activo
       FROM usuario u LEFT JOIN sector s ON s.id_sector = u.id_sector
      WHERE u.rol = 'ENCARGADO' ORDER BY u.id_usuario`
  );
  return rows.map(formatearEncargado);
}

async function sectorActivo(cliente, id) {
  const { rows } = await cliente.query('SELECT 1 FROM sector WHERE id_sector = $1 AND activo = TRUE', [id]);
  if (!rows.length) throw errorHttp(404, 'Sector no encontrado');
}

async function crearEncargado(admin, { username, nombreCompleto, idSector, password }) {
  const usuario = validarTexto(username, 'username', 40);
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(usuario)) throw errorHttp(400, 'username: de 3 a 40 caracteres (letras, números, punto, guion)');
  const nombre = validarTexto(nombreCompleto, 'nombreCompleto', 100);
  const sector = idValido(idSector);
  if (!sector) throw errorHttp(400, 'idSector debe ser un entero positivo');
  validarContrasena(password);
  const hash = await bcrypt.hash(password, config.bcryptRondas);
  return transaccion(async (cliente) => {
    await sectorActivo(cliente, sector);
    const { rows: dup } = await cliente.query('SELECT 1 FROM usuario WHERE username = $1', [usuario]);
    if (dup.length) throw errorHttp(409, 'Ese nombre de usuario ya existe');
    const { rows } = await cliente.query(
      `INSERT INTO usuario (id_sector, nombre_completo, username, password_hash, rol)
       VALUES ($1, $2, $3, $4, 'ENCARGADO') RETURNING id_usuario, nombre_completo, username, id_sector, activo`,
      [sector, nombre, usuario, hash]
    );
    await cliente.query(
      `INSERT INTO bitacora (id_usuario, entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ($1, 'USUARIO', $2, 'CREACION_ENCARGADO', NULL, 'ACTIVO')`,
      [admin.id, rows[0].id_usuario]
    );
    return formatearEncargado({ ...rows[0], sector: null });
  });
}

async function editarEncargado(admin, idCrudo, { nombreCompleto, idSector, activo }) {
  const id = idValido(idCrudo);
  if (!id) throw errorHttp(400, 'Identificador de usuario inválido');
  const sets = []; const params = [id];
  if (nombreCompleto !== undefined) { params.push(validarTexto(nombreCompleto, 'nombreCompleto', 100)); sets.push(`nombre_completo = $${params.length}`); }
  if (idSector !== undefined) { const s = idValido(idSector); if (!s) throw errorHttp(400, 'idSector debe ser un entero positivo'); params.push(s); sets.push(`id_sector = $${params.length}`); }
  if (activo !== undefined) { if (typeof activo !== 'boolean') throw errorHttp(400, 'activo debe ser true o false'); params.push(activo); sets.push(`activo = $${params.length}`); }
  if (!sets.length) throw errorHttp(400, 'No hay nada que cambiar');
  return transaccion(async (cliente) => {
    if (idSector !== undefined) await sectorActivo(cliente, idValido(idSector));
    const { rows } = await cliente.query(
      `UPDATE usuario SET ${sets.join(', ')} WHERE id_usuario = $1 AND rol = 'ENCARGADO'
       RETURNING id_usuario, nombre_completo, username, id_sector, activo`,
      params
    );
    if (!rows.length) throw errorHttp(404, 'Encargado no encontrado');
    await cliente.query(
      `INSERT INTO bitacora (id_usuario, entidad, id_entidad, accion, estado_anterior, estado_nuevo)
       VALUES ($1, 'USUARIO', $2, 'EDICION_ENCARGADO', NULL, $3)`,
      [admin.id, id, rows[0].activo ? 'ACTIVO' : 'DESACTIVADO']
    );
    return formatearEncargado({ ...rows[0], sector: null });
  });
}

async function restablecerContrasena(admin, idCrudo, password) {
  const id = idValido(idCrudo);
  if (!id) throw errorHttp(400, 'Identificador de usuario inválido');
  validarContrasena(password);
  const hash = await bcrypt.hash(password, config.bcryptRondas);
  const { rowCount } = await pool.query(
    `UPDATE usuario SET password_hash = $2 WHERE id_usuario = $1 AND rol = 'ENCARGADO'`,
    [id, hash]
  );
  if (!rowCount) throw errorHttp(404, 'Encargado no encontrado');
  await pool.query(
    `INSERT INTO bitacora (id_usuario, entidad, id_entidad, accion, estado_anterior, estado_nuevo)
     VALUES ($1, 'USUARIO', $2, 'RESTABLECER_CONTRASENA', NULL, 'CONTRASENA_NUEVA')`,
    [admin.id, id]
  );
  return { id };
}

module.exports = {
  listarLugares, listarCancelaciones, listarPagos, resumen, listarTarifas, cambiarTarifa,
  listarEncargados, crearEncargado, editarEncargado, restablecerContrasena,
};
