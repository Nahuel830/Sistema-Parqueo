const test = require('node:test');
const assert = require('node:assert/strict');
const { manejadorErrores } = require('../src/middlewares/errores');

function respuestaFalsa() {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
}

test('manejadorErrores_JSONInvalido_Responde400', () => {
  // Arrange
  const error = new Error('Unexpected token');
  error.type = 'entity.parse.failed';
  const res = respuestaFalsa();

  // Act
  manejadorErrores(error, {}, res, () => assert.fail('no debe llamar next'));

  // Assert
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.ok, false);
  assert.match(res.cuerpo.mensaje, /JSON/);
});

test('manejadorErrores_ErrorDeConexion_Responde503', () => {
  // Arrange
  const error = new Error('connect ECONNREFUSED');
  error.code = 'ECONNREFUSED';
  const res = respuestaFalsa();

  // Act
  manejadorErrores(error, {}, res, () => assert.fail('no debe llamar next'));

  // Assert
  assert.equal(res.codigo, 503);
  assert.equal(res.cuerpo.ok, false);
});

test('manejadorErrores_ErrorConStatus_UsaEseStatusYMensaje', () => {
  // Arrange
  const error = new Error('La reserva no existe');
  error.status = 404;
  const res = respuestaFalsa();

  // Act
  manejadorErrores(error, {}, res, () => assert.fail('no debe llamar next'));

  // Assert
  assert.equal(res.codigo, 404);
  assert.equal(res.cuerpo.mensaje, 'La reserva no existe');
});

test('manejadorErrores_ErrorSinStatus_Responde500Generico', () => {
  // Arrange
  const error = new Error('detalle interno que no debe exponerse');
  const res = respuestaFalsa();

  // Act
  manejadorErrores(error, {}, res, () => assert.fail('no debe llamar next'));

  // Assert
  assert.equal(res.codigo, 500);
  assert.equal(res.cuerpo.mensaje, 'Error interno del servidor');
});
