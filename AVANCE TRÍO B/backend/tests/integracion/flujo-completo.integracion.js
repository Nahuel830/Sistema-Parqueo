// Prueba de integración de punta a punta: API real + PostgreSQL real.
//
// IMPORTANTE: reinicia las tablas (ejecuta db/schema.sql). Por seguridad solo corre si
// DB_NAME contiene "test", para no borrar una base de desarrollo por error.
//
// Uso (ejemplo):
//   DB_NAME=parqueo_test JWT_SECRET=<32+ caracteres> PASARELA_SECRET=<16+ caracteres> \
//   BCRYPT_ROUNDS=4 npm run test:integracion
const nombreBd = process.env.DB_NAME || '';
if (!/test/i.test(nombreBd)) {
  console.error('Esta prueba reinicia las tablas. Usa una base cuyo nombre contenga "test" (DB_NAME=parqueo_test).');
  process.exit(1);
}
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { pool, cerrarPool } = require('../../src/config/db');
const { crearApp } = require('../../src/app');
const { config } = require('../../src/config/env');
const { expirarReservasPendientes } = require('../../src/services/reservas.service');

const CLAVE_ENC = 'Clave-Enc-Prueba-1';
const CLAVE_ADM = 'Clave-Admin-Prueba-1';
let servidor; let base;

async function api(metodo, ruta, { body, token, headers = {} } = {}) {
  const r = await fetch(`${base}/api${ruta}`, {
    method: metodo,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json() };
}
const login = async (username, password) => (await api('POST', '/auth/login', { body: { username, password } })).json.datos?.token;
const reservar = (idLugar) => api('POST', '/reservas', { body: { idLugar } });
const conToken = (r) => ({ 'x-reserva-token': r.json.datos.tokenReserva });
const SECRETO_PASARELA = process.env.PASARELA_SECRET;

test.before(async () => {
  assert.ok(SECRETO_PASARELA, 'Falta PASARELA_SECRET');
  await pool.query(fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8'));
  const h = (c) => bcrypt.hashSync(c, 4);
  await pool.query(
    `INSERT INTO usuario (id_sector, nombre_completo, username, password_hash, rol) VALUES
       (NULL, 'Administrador', 'admin', $1, 'ADMIN'),
       (1, 'Encargado Plaza Sucre', 'encargado1', $2, 'ENCARGADO'),
       (2, 'Encargado Palacio de Justicia', 'encargado2', $2, 'ENCARGADO')`,
    [h(CLAVE_ADM), h(CLAVE_ENC)]
  );
  servidor = crearApp().listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await cerrarPool();
});

test('estado_ConexionABaseDeDatos_RespondeOk', async () => {
  const r = await api('GET', '/estado/bd');
  assert.equal(r.status, 200);
});

test('sectores_Listado_Devuelve2SectoresCon20LugaresLibres', async () => {
  const r = await api('GET', '/sectores');
  assert.equal(r.json.datos.length, 2);
  assert.ok(r.json.datos.every((s) => s.totalLugares === 20 && s.lugaresLibres === 20));
});

test('reservar_LugarLibre_Responde201YElLugarQuedaReservado', async () => {
  const r = await reservar(1);
  assert.equal(r.status, 201);
  assert.equal(r.json.datos.estado, 'ACTIVA');
  const dif = new Date(r.json.datos.fechaExpiracion) - new Date(r.json.datos.fechaInicio);
  assert.equal(dif, 5 * 60 * 1000);
  const { rows } = await pool.query('SELECT estado FROM lugar WHERE id_lugar = 1');
  assert.equal(rows[0].estado, 'RESERVADO');
});

test('reservar_LugarYaReservado_Responde409', async () => {
  assert.equal((await reservar(1)).status, 409);
});

test('reservar_20ConductoresALaVezAlMismoLugar_SoloUnoLoConsigue', async () => {
  const resp = await Promise.all(Array.from({ length: 20 }, () => reservar(3)));
  const codigos = resp.map((r) => r.status).sort();
  assert.equal(codigos.filter((c) => c === 201).length, 1);
  assert.equal(codigos.filter((c) => c === 409).length, 19);
});

test('cancelar_ReservaActiva_LiberaElLugarYRegistraLaCancelacion', async () => {
  const r = await reservar(4);
  const c = await api('POST', `/reservas/${r.json.datos.id}/cancelar`, { headers: conToken(r) });
  assert.equal(c.status, 200);
  const { rows } = await pool.query(
    `SELECT l.estado, c.tipo FROM lugar l JOIN reserva r ON r.id_lugar = l.id_lugar
       JOIN cancelacion c ON c.id_reserva = r.id_reserva WHERE l.id_lugar = 4`
  );
  assert.deepEqual([rows[0].estado, rows[0].tipo], ['LIBRE', 'CONDUCTOR']);
});

test('reservaSinToken_ConsultaOCancelacion_Responde403', async () => {
  const r = await reservar(5);
  assert.equal((await api('GET', `/reservas/${r.json.datos.id}`)).status, 403);
  assert.equal((await api('POST', `/reservas/${r.json.datos.id}/cancelar`)).status, 403);
  await api('POST', `/reservas/${r.json.datos.id}/cancelar`, { headers: conToken(r) });
});

test('expiracion_ReservaVencida_SeLiberaYRegistraLaExpiracion', async () => {
  const r = await reservar(6);
  await pool.query(`UPDATE reserva SET fecha_expiracion = NOW() - INTERVAL '1 second' WHERE id_reserva = $1`, [r.json.datos.id]);
  assert.ok((await expirarReservasPendientes()) >= 1);
  const { rows } = await pool.query(
    `SELECT l.estado AS lugar, r.estado AS reserva, c.tipo FROM reserva r JOIN lugar l ON l.id_lugar = r.id_lugar
       JOIN cancelacion c ON c.id_reserva = r.id_reserva WHERE r.id_reserva = $1`,
    [r.json.datos.id]
  );
  assert.deepEqual([rows[0].lugar, rows[0].reserva, rows[0].tipo], ['LIBRE', 'EXPIRADA', 'EXPIRACION']);
});

test('pagoQr_ConfirmacionDeLaPasarela_EmiteFichaYOcupaElLugar', async () => {
  const r = await reservar(7);
  const p = await api('POST', `/reservas/${r.json.datos.id}/pago`, { body: { metodo: 'QR' }, headers: conToken(r) });
  assert.equal(p.status, 201);
  const ref = p.json.datos.referencia;
  assert.equal((await api('POST', '/pagos/qr/confirmar', { body: { referencia: ref } })).status, 403, 'sin secreto');
  const c = await api('POST', '/pagos/qr/confirmar', { body: { referencia: ref }, headers: { 'x-pasarela-secret': SECRETO_PASARELA } });
  assert.equal(c.status, 200);
  assert.match(c.json.datos.ficha.codigo, /^PQ-[A-F0-9]{16}$/);
  const otra = await api('POST', '/pagos/qr/confirmar', { body: { referencia: ref }, headers: { 'x-pasarela-secret': SECRETO_PASARELA } });
  assert.equal(otra.json.datos.ficha.codigo, c.json.datos.ficha.codigo, 'idempotente');
  const { rows } = await pool.query('SELECT estado FROM lugar WHERE id_lugar = 7');
  assert.equal(rows[0].estado, 'OCUPADO');
  const f = await api('GET', `/reservas/${r.json.datos.id}/ficha`, { headers: conToken(r) });
  assert.equal(f.status, 200);
});

test('pagoQr_ConfirmacionConLaReservaVencida_NoSeAplica', async () => {
  const r = await reservar(8);
  const p = await api('POST', `/reservas/${r.json.datos.id}/pago`, { body: { metodo: 'QR' }, headers: conToken(r) });
  await pool.query(`UPDATE reserva SET fecha_expiracion = NOW() - INTERVAL '1 second' WHERE id_reserva = $1`, [r.json.datos.id]);
  const c = await api('POST', '/pagos/qr/confirmar', { body: { referencia: p.json.datos.referencia }, headers: { 'x-pasarela-secret': SECRETO_PASARELA } });
  assert.equal(c.status, 410);
  await expirarReservasPendientes();
});

test('login_CredencialesIncorrectas_Responde401ConElMismoMensaje', async () => {
  const a = await api('POST', '/auth/login', { body: { username: 'encargado1', password: 'mala' } });
  const b = await api('POST', '/auth/login', { body: { username: 'noexiste', password: 'mala' } });
  assert.equal(a.status, 401);
  assert.equal(a.json.mensaje, b.json.mensaje);
});

test('permisos_RolesYSesion_SeRespetan', async () => {
  const enc = await login('encargado1', CLAVE_ENC);
  const adm = await login('admin', CLAVE_ADM);
  assert.equal((await api('GET', '/encargado/lugares')).status, 401);
  assert.equal((await api('GET', '/encargado/lugares', { token: 'abc.def.ghi' })).status, 401);
  assert.equal((await api('GET', '/encargado/lugares', { token: adm })).status, 403);
  assert.equal((await api('GET', '/admin/lugares', { token: enc })).status, 403);
  assert.equal((await api('GET', '/admin/lugares', { token: adm })).json.datos.length, 40);
});

test('efectivo_EncargadoCobraVerificaYMarcaPagada_SoloEnSuSector', async () => {
  const enc1 = await login('encargado1', CLAVE_ENC);
  const enc2 = await login('encargado2', CLAVE_ENC);
  const r = await reservar(9); // sector 1
  const p = await api('POST', `/reservas/${r.json.datos.id}/pago`, { body: { metodo: 'EFECTIVO' }, headers: conToken(r) });
  const codigo = p.json.datos.ficha.codigo;
  assert.equal((await api('GET', `/encargado/fichas/${codigo}`, { token: enc2 })).status, 404, 'otro sector');
  assert.equal((await api('POST', `/encargado/fichas/${codigo}/cobrar`, { token: enc2 })).status, 404);
  assert.equal((await api('POST', `/encargado/fichas/${codigo}/verificar`, { token: enc1 })).status, 409, 'primero cobrar');
  assert.equal((await api('POST', `/encargado/fichas/${codigo}/cobrar`, { token: enc1 })).status, 200);
  assert.equal((await api('POST', `/encargado/fichas/${codigo}/cobrar`, { token: enc1 })).status, 409, 'cobro repetido');
  assert.equal((await api('POST', `/encargado/fichas/${codigo}/verificar`, { token: enc1 })).json.datos.estado, 'VERIFICADA');
  assert.equal((await api('POST', `/encargado/fichas/${codigo}/pagada`, { token: enc1 })).json.datos.estado, 'PAGADA');
  const { rows } = await pool.query('SELECT estado FROM lugar WHERE id_lugar = 9');
  assert.equal(rows[0].estado, 'OCUPADO');
  const notif = await api('GET', '/encargado/notificaciones', { token: enc1 });
  assert.ok(notif.json.datos.length >= 1);
});

test('efectivo_CobrarConLaReservaVencida_Responde410YLaFichaSeAnula', async () => {
  const enc1 = await login('encargado1', CLAVE_ENC);
  const r = await reservar(10);
  const p = await api('POST', `/reservas/${r.json.datos.id}/pago`, { body: { metodo: 'EFECTIVO' }, headers: conToken(r) });
  const codigo = p.json.datos.ficha.codigo;
  await pool.query(`UPDATE reserva SET fecha_expiracion = NOW() - INTERVAL '1 second' WHERE id_reserva = $1`, [r.json.datos.id]);
  assert.equal((await api('POST', `/encargado/fichas/${codigo}/cobrar`, { token: enc1 })).status, 410);
  await expirarReservasPendientes();
  assert.equal((await api('GET', `/encargado/fichas/${codigo}`, { token: enc1 })).json.datos.estado, 'ANULADA');
});

test('admin_CambiarTarifa_LaReservaNuevaCobraElMontoNuevo', async () => {
  const adm = await login('admin', CLAVE_ADM);
  assert.equal((await api('PUT', '/admin/tarifas/1', { token: adm, body: { monto: '-1' } })).status, 400);
  assert.equal((await api('PUT', '/admin/tarifas/1', { token: adm, body: { monto: '4.50' } })).status, 200);
  const r = await reservar(11);
  assert.equal(r.json.datos.monto, '4.50');
  await api('POST', `/reservas/${r.json.datos.id}/cancelar`, { headers: conToken(r) });
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM tarifa WHERE id_sector = 1 AND activo AND vigente_hasta IS NULL');
  assert.equal(rows[0].n, 1);
});

test('admin_CancelacionesPagosYResumen_ReflejanLoOcurrido', async () => {
  const adm = await login('admin', CLAVE_ADM);
  const canc = await api('GET', '/admin/cancelaciones', { token: adm });
  assert.ok(canc.json.datos.some((c) => c.tipo === 'EXPIRACION') && canc.json.datos.some((c) => c.tipo === 'CONDUCTOR'));
  const soloExp = await api('GET', '/admin/cancelaciones?tipo=EXPIRACION', { token: adm });
  assert.ok(soloExp.json.datos.every((c) => c.tipo === 'EXPIRACION'));
  const pagos = await api('GET', '/admin/pagos?metodo=QR', { token: adm });
  assert.ok(pagos.json.datos.length >= 1 && pagos.json.datos.every((p) => p.metodo === 'QR'));
  const res = await api('GET', '/admin/reportes/resumen', { token: adm });
  assert.ok(Number(res.json.datos.totalCobrado) > 0);
  assert.equal((await api('GET', '/admin/cancelaciones?desde=hoy', { token: adm })).status, 400);
});

test('admin_DesactivarEncargado_PierdeElAccesoDeInmediato', async () => {
  const adm = await login('admin', CLAVE_ADM);
  const enc2 = await login('encargado2', CLAVE_ENC);
  assert.equal((await api('GET', '/encargado/lugares', { token: enc2 })).status, 200);
  const { rows } = await pool.query(`SELECT id_usuario FROM usuario WHERE username = 'encargado2'`);
  const d = await api('PATCH', `/admin/encargados/${rows[0].id_usuario}`, { token: adm, body: { activo: false } });
  assert.equal(d.status, 200);
  assert.equal((await api('GET', '/encargado/lugares', { token: enc2 })).status, 401);
  assert.equal((await api('POST', '/auth/login', { body: { username: 'encargado2', password: CLAVE_ENC } })).status, 401);
});

test('bitacora_Acciones_QuedanRegistradasConSuResponsable', async () => {
  const { rows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE id_usuario IS NOT NULL)::int AS con_usuario, COUNT(*)::int AS total FROM bitacora`
  );
  assert.ok(rows[0].total > 20 && rows[0].con_usuario > 5);
});

test('catálogo del administrador, visibilidad pública y protección de reservas', async () => {
  const token = await login('admin', CLAVE_ADM);
  const sector = await api('POST', '/admin/sectores', { token, body: { nombre: 'Sector de prueba', monto: '2.50' } });
  assert.equal(sector.status, 201);
  const ruta = `/admin/sectores/${sector.json.datos.id}`;
  const alta = await api('POST', `${ruta}/lugares`, { token, body: { numero: 1 } });
  assert.equal(alta.status, 201);
  const id = alta.json.datos.id;
  assert.equal((await api('POST', `${ruta}/lugares`, { token, body: { numero: 1 } })).status, 409);
  const reserva = await reservar(id);
  assert.equal(reserva.json.datos.monto, '2.50');
  assert.equal((await api('PATCH', ruta, { token, body: { activo: false } })).status, 409);
  assert.equal((await api('PATCH', `${ruta}/lugares/${id}`, { token, body: { activo: false } })).status, 409);
  await api('POST', `/reservas/${reserva.json.datos.id}/cancelar`, { headers: conToken(reserva) });
  assert.equal((await api('PATCH', `${ruta}/lugares/${id}`, { token, body: { numero: 8, activo: false } })).status, 200);
  const catalogo = await api('GET', `${ruta}/lugares`, { token });
  assert.equal(catalogo.json.datos.sector.totalLugares, 0);
  assert.equal(catalogo.json.datos.lugares[0].numero, 8);
  assert.equal((await reservar(id)).status, 404);
  assert.equal((await api('PATCH', ruta, { token, body: { nombre: 'Sector histórico', activo: false } })).status, 200);
  assert.ok(!(await api('GET', '/sectores')).json.datos.some(({ id }) => id === sector.json.datos.id));
});

test('salida en el sector asignado, bitácora y protección contra una solicitud atrasada', async () => {
  const token = await login('encargado1', CLAVE_ENC);
  const adm = await login('admin', CLAVE_ADM);
  const lugares = (await api('GET', '/encargado/lugares', { token })).json.datos.lugares;
  const ocupado = lugares.find(({ id }) => id === 9);
  const liberar = (id, idReserva) => api('POST', `/encargado/lugares/${id}/liberar`, { token, body: { idReserva } });
  assert.equal(ocupado.estado, 'OCUPADO');
  assert.equal((await liberar(21, ocupado.idReserva)).status, 404);
  assert.equal((await liberar(9, ocupado.idReserva)).status, 200);
  const nueva = await reservar(9);
  const idNueva = nueva.json.datos.id;
  const pago = await api('POST', `/reservas/${idNueva}/pago`, { headers: conToken(nueva), body: { metodo: 'EFECTIVO' } });
  assert.equal((await api('POST', `/encargado/fichas/${pago.json.datos.ficha.codigo}/cobrar`, { token })).status, 200);
  assert.equal((await liberar(9, ocupado.idReserva)).status, 409);
  const registros = (await api('GET', '/admin/bitacora', { token: adm })).json.datos;
  assert.ok(registros.some(({ accion, idEntidad, responsable }) =>
    accion === 'LIBERACION_POR_SALIDA' && idEntidad === 9 && responsable === 'Encargado Plaza Sucre'));
  assert.equal((await liberar(9, idNueva)).status, 200);
  const { rows } = await pool.query("SELECT id_reserva FROM pago WHERE estado = 'CONFIRMADO' AND id_reserva IN ($1, $2)", [ocupado.idReserva, idNueva]);
  assert.equal(rows.length, 2);
});

test('reporte filtrado para administrador con adjuntos PDF y XLSX', async () => {
  const token = await login('admin', CLAVE_ADM);
  const ruta = '/admin/reportes/resumen';
  const filtros = '?idSector=1';
  const consulta = await api('GET', ruta + filtros, { token });
  assert.ok(consulta.json.datos.ocupacionActual.every(({ sector }) => sector === 'Plaza Sucre'));
  assert.ok(consulta.json.datos.ingresosPorSectorYMetodo.some(({ metodo }) => metodo === 'QR'));
  assert.ok(consulta.json.datos.ingresosPorSectorYMetodo.some(({ metodo }) => metodo === 'EFECTIVO'));
  assert.equal((await api('GET', ruta + '?desde=2026-02-30', { token })).status, 400);
  assert.equal((await api('GET', ruta + '/pdf')).status, 401);
  for (const [formato, firma, tipo] of [
    ['pdf', '%PDF-', 'application/pdf'],
    ['xlsx', 'PK', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ]) {
    const respuesta = await fetch(`${base}/api${ruta}/${formato}${filtros}`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get('content-type'), tipo);
    assert.match(respuesta.headers.get('content-disposition'), new RegExp(`reporte-parqueo\\.${formato}`));
    assert.ok(Buffer.from(await respuesta.arrayBuffer()).toString('ascii', 0, firma.length).startsWith(firma));
  }
});

test('Red Enlace verifica el QR con la pasarela y reconoce un pago en plazo aunque llegue después', async (t) => {
  const pasarela = config.pasarela;
  const redEnlaceOriginal = { ...pasarela.redEnlace };
  const proveedorOriginal = pasarela.proveedor;
  const origen = 'https://redenlace.prueba';
  Object.assign(pasarela.redEnlace, { base: origen, basic: 'prueba', cliente: 'local', establecimiento: 1,
    nombre: 'Prueba', webhook: 'https://parqueo.prueba/api/pagos/qr/confirmar' });
  pasarela.proveedor = 'redenlace';
  t.after(() => {
    Object.assign(pasarela.redEnlace, redEnlaceOriginal);
    pasarela.proveedor = proveedorOriginal;
  });

  let fechaPago, comprobado;
  let montoVerificado;
  const fetchOriginal = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (url, opciones) => {
    if (!url.startsWith(origen)) return fetchOriginal(url, opciones);
    if (url.includes('oauth-client-credentials')) return Response.json({ access_token: 'local', expires_in: 3600 });
    const referencia = '12345678';
    if (url.endsWith('/generate')) {
      const datos = JSON.parse(opciones.body);
      assert.equal(datos.moneda, 'BOB');
      assert.ok(datos.vigencia < 300);
      assert.equal(datos.webhook.key, 'x-pasarela-secret');
      comprobado = { numeroReferencia: referencia, numeroReferenciaOriginante: datos.numeroReferencia, moneda: 'BOB', monto: datos.monto };
      return Response.json({ success: true, data: { ...comprobado, estado: 'PENDIENTE', qr: 'iVBORw0KGgoAAA=' } });
    }
    assert.ok(url.endsWith(`/verify/${referencia}`));
    return Response.json({ success: true, data: {
      ...comprobado,
      importe: montoVerificado,
      estado: 'PAGADO',
      bancoOrigen: { fechaTransaccion: fechaPago },
    } });
  });
  const reserva = await reservar(13);
  const id = reserva.json.datos.id;
  const inicio = await api('POST', `/reservas/${id}/pago`, { body: { metodo: 'QR' }, headers: conToken(reserva) });
  assert.equal(inicio.status, 201);
  assert.match(inicio.json.datos.imagenQr, /^data:image\/png;base64,/);
  const webhook = (secreto) => api('POST', '/pagos/qr/confirmar', {
    body: { numeroReferencia: comprobado.numeroReferencia, monto: comprobado.monto },
    headers: { 'x-pasarela-secret': secreto },
  });
  assert.equal((await webhook('incorrecto')).status, 403);
  const { rows: [res] } = await pool.query(
    "UPDATE reserva SET fecha_expiracion = fecha_inicio + INTERVAL '1 millisecond' WHERE id_reserva = $1 RETURNING fecha_inicio", [id]
  );
  fechaPago = res.fecha_inicio.toISOString();
  montoVerificado = comprobado.monto + 1;
  assert.equal((await webhook(SECRETO_PASARELA)).status, 503);
  assert.equal((await api('GET', `/reservas/${id}/ficha`, { headers: conToken(reserva) })).status, 404);
  montoVerificado = comprobado.monto;
  await expirarReservasPendientes();
  assert.equal((await webhook(SECRETO_PASARELA)).status, 200);
  const ficha = await api('GET', `/reservas/${id}/ficha`, { headers: conToken(reserva) });
  assert.equal(ficha.json.datos.estadoPago, 'CONFIRMADO');
  const { rows: [estado] } = await pool.query('SELECT estado FROM lugar WHERE id_lugar = 13');
  assert.equal(estado.estado, 'OCUPADO');
});
