process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const { errorHttp, idValido } = require('../src/utils/http');

test('errorHttp_CreaErrorConStatusYMensaje', () => {
  // Arrange
  const status = 404;
  const mensaje = 'No encontrado';

  // Act
  const error = errorHttp(status, mensaje);

  // Assert
  assert.ok(error instanceof Error);
  assert.equal(error.status, 404);
  assert.equal(error.message, 'No encontrado');
});

test('idValido_EnteroPositivo_DevuelveElNumero', () => {
  // Arrange
  const entradas = [5, '5', '  12  '];

  // Act & Assert
  for (const entrada of entradas) {
    assert.equal(idValido(entrada), Number(entrada));
  }
});

test('idValido_ValoresInvalidos_DevuelveNull', () => {
  // Arrange
  const entradas = [0, -1, 'abc', '', null, undefined, 2.5, Number.MAX_SAFE_INTEGER + 1];

  // Act & Assert
  for (const entrada of entradas) {
    assert.equal(idValido(entrada), null, `entrada: ${entrada}`);
  }
});
