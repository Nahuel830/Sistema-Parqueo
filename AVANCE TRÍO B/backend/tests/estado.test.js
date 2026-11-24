process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const { obtenerEstado } = require('../src/controllers/estado.controller');

function respuestaFalsa() {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
}

test('obtenerEstado_APIActiva_RespondeDatosOperativos', () => {
  // Arrange
  const res = respuestaFalsa();

  // Act
  obtenerEstado({}, res);

  // Assert
  assert.equal(res.codigo, null);
  assert.equal(res.cuerpo.ok, true);
  assert.equal(typeof res.cuerpo.entorno, 'string');
  assert.equal(typeof res.cuerpo.zonaHoraria, 'string');
  assert.equal(typeof res.cuerpo.fechaHora, 'string');
  assert.match(res.cuerpo.mensaje, /operativa/i);
});
