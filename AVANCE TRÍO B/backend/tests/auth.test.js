process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { crearAutenticar, exigirRol } = require('../src/middlewares/auth');
const { crearLimiteLogin } = require('../src/middlewares/limiteLogin');

const SECRETO = process.env.JWT_SECRET;

function respuestaFalsa() {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
}
function peticion(cabecera) {
  return { get: (n) => (n.toLowerCase() === 'authorization' ? cabecera : undefined), body: {}, ip: '1.1.1.1' };
}
const token = (extra = {}, opciones = {}) =>
  jwt.sign({ rol: 'ENCARGADO', idSector: 1, username: 'enc', ...extra }, SECRETO, { algorithm: 'HS256', subject: '7', expiresIn: '1h', ...opciones });

test('autenticar_SinCabecera_Responde401', async () => {
  const res = respuestaFalsa();
  await crearAutenticar(async () => null)(peticion(undefined), res, () => assert.fail('no debe continuar'));
  assert.equal(res.codigo, 401);
});

test('autenticar_TokenFalso_Responde401', async () => {
  const res = respuestaFalsa();
  await crearAutenticar(async () => ({}))(peticion('Bearer abc.def.ghi'), res, () => assert.fail('no debe continuar'));
  assert.equal(res.codigo, 401);
});

test('autenticar_TokenFirmadoConOtroSecreto_Responde401', async () => {
  const falso = jwt.sign({ rol: 'ADMIN' }, 'otro_secreto_distinto_con_mas_de_32_caracteres', { subject: '1' });
  const res = respuestaFalsa();
  await crearAutenticar(async () => ({}))(peticion(`Bearer ${falso}`), res, () => assert.fail('no debe continuar'));
  assert.equal(res.codigo, 401);
});

test('autenticar_TokenSinFirma_Responde401', async () => {
  const sinFirma = jwt.sign({ rol: 'ADMIN' }, '', { algorithm: 'none', subject: '1' });
  const res = respuestaFalsa();
  await crearAutenticar(async () => ({}))(peticion(`Bearer ${sinFirma}`), res, () => assert.fail('no debe continuar'));
  assert.equal(res.codigo, 401);
});

test('autenticar_TokenVencido_Responde401', async () => {
  const res = respuestaFalsa();
  const vencido = token({}, { expiresIn: -10 });
  await crearAutenticar(async () => ({}))(peticion(`Bearer ${vencido}`), res, () => assert.fail('no debe continuar'));
  assert.equal(res.codigo, 401);
});

test('autenticar_UsuarioDesactivado_Responde401', async () => {
  const res = respuestaFalsa();
  await crearAutenticar(async () => null)(peticion(`Bearer ${token()}`), res, () => assert.fail('no debe continuar'));
  assert.equal(res.codigo, 401);
});

test('autenticar_TokenValidoYUsuarioActivo_ContinuaConElUsuario', async () => {
  const req = peticion(`Bearer ${token()}`);
  const buscar = async (id) => ({ id_usuario: id, rol: 'ENCARGADO', id_sector: 1, username: 'enc', nombre_completo: 'Enc' });
  let siguio = false;
  await crearAutenticar(buscar)(req, respuestaFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
  assert.deepEqual([req.usuario.id, req.usuario.rol, req.usuario.idSector], [7, 'ENCARGADO', 1]);
});

test('exigirRol_RolNoPermitido_Responde403', () => {
  const res = respuestaFalsa();
  exigirRol('ADMIN')({ usuario: { rol: 'ENCARGADO' } }, res, () => assert.fail('no debe continuar'));
  assert.equal(res.codigo, 403);
});

test('exigirRol_RolPermitido_Continua', () => {
  let siguio = false;
  exigirRol('ENCARGADO', 'ADMIN')({ usuario: { rol: 'ADMIN' } }, respuestaFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
});

test('limiteLogin_CincoFallos_BloqueaElSextoIntento', () => {
  const limite = crearLimiteLogin({ maximo: 5 });
  const req = { ip: '2.2.2.2', body: { username: 'admin' } };
  for (let i = 0; i < 5; i++) limite.registrarFallo(req);
  const res = respuestaFalsa();
  limite.verificar(req, res, () => assert.fail('debe bloquear'));
  assert.equal(res.codigo, 429);
});

test('limiteLogin_PasadaLaVentana_VuelvePermitir', () => {
  let ahora = 0;
  const limite = crearLimiteLogin({ maximo: 2, ventanaMs: 1000, ahora: () => ahora });
  const req = { ip: '3.3.3.3', body: { username: 'x' } };
  limite.registrarFallo(req); limite.registrarFallo(req);
  ahora = 1500;
  let siguio = false;
  limite.verificar(req, respuestaFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
});

test('limiteLogin_InicioDeSesionCorrecto_ReiniciaElContador', () => {
  const limite = crearLimiteLogin({ maximo: 2 });
  const req = { ip: '4.4.4.4', body: { username: 'y' } };
  limite.registrarFallo(req); limite.registrarFallo(req);
  limite.limpiar(req);
  let siguio = false;
  limite.verificar(req, respuestaFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
});
