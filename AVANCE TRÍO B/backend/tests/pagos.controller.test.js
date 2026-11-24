process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';
process.env.PASARELA_SECRET = process.env.PASARELA_SECRET || 'secreto_pasarela_de_prueba_123';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pagar, confirmarQr } = require('../src/controllers/pagos.controller');
const { pool } = require('../src/config/db');

test.after(async () => {
  await pool.end();
});

const SECRETO_PASARELA = 'secreto_pasarela_de_prueba_123';

function peticion({ params = {}, body = {}, headers = {} } = {}) {
  return {
    params,
    body,
    query: {},
    get: (nombre) => headers[nombre.toLowerCase()],
  };
}
function respuestaFalsa() {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
}

test('pagar_MetodoInvalido_PasaError400ANext', async () => {
  // Arrange
  const req = peticion({ params: { id: '1' }, body: { metodo: 'TARJETA' }, headers: { 'x-reserva-token': 'tok' } });
  const res = respuestaFalsa();

  // Act
  let capturado = null;
  await pagar(req, res, (e) => { capturado = e; });

  // Assert
  assert.ok(capturado);
  assert.equal(capturado.status, 400);
});

test('confirmarQr_SinSecreto_Pasa403', async () => {
  // Arrange
  const req = peticion({ body: { referencia: 'a'.repeat(24) } });
  const res = respuestaFalsa();

  // Act
  await confirmarQr(req, res, () => assert.fail('no debe llamar next'));

  // Assert
  assert.equal(res.codigo, 403);
  assert.equal(res.cuerpo.ok, false);
});

test('confirmarQr_SecretoIncorrecto_Pasa403', async () => {
  // Arrange
  const req = peticion({
    body: { referencia: 'a'.repeat(24) },
    headers: { 'x-pasarela-secret': 'secreto-equivocado' },
  });
  const res = respuestaFalsa();

  // Act
  await confirmarQr(req, res, () => assert.fail('no debe llamar next'));

  // Assert
  assert.equal(res.codigo, 403);
});

test('confirmarQr_ReferenciaInvalidaConSecretoCorrecto_PasaError400ANext', async () => {
  // Arrange
  const req = peticion({
    body: { referencia: 'referencia-mala' },
    headers: { 'x-pasarela-secret': SECRETO_PASARELA },
  });
  const res = respuestaFalsa();

  // Act
  let capturado = null;
  await confirmarQr(req, res, (e) => { capturado = e; });

  // Assert
  assert.ok(capturado);
  assert.equal(capturado.status, 400);
});
