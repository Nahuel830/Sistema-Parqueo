const test = require('node:test');
const assert = require('node:assert/strict');
const { noEncontrado } = require('../src/middlewares/noEncontrado');

function respuestaFalsa() {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
}

test('noEncontrado_RutaInexistente_Responde404ConLaRuta', () => {
  // Arrange
  const req = { method: 'GET', originalUrl: '/api/ruta-que-no-existe' };
  const res = respuestaFalsa();

  // Act
  noEncontrado(req, res);

  // Assert
  assert.equal(res.codigo, 404);
  assert.equal(res.cuerpo.ok, false);
  assert.match(res.cuerpo.mensaje, /GET \/api\/ruta-que-no-existe/);
});
