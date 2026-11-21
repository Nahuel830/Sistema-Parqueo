const test = require('node:test');
const assert = require('node:assert/strict');
const { tokenDeReserva, tokenValido } = require('../src/utils/seguridadReserva');

const secreto = '1234567890abcdefghijklmnopqrstuvWXYZ';
const fecha = new Date('2026-11-19T19:00:00.000Z');

test('crea un token temporal determinista', () => {
  const token = tokenDeReserva(100, fecha, secreto);
  assert.equal(token.length, 64);
  assert.ok(tokenValido(token, 100, fecha, secreto));
});

test('rechaza token de otro conductor/reserva', () => {
  const token = tokenDeReserva(100, fecha, secreto);
  assert.equal(tokenValido(token, 101, fecha, secreto), false);
  assert.equal(tokenValido('abcd', 100, fecha, secreto), false);
});

test('rechaza tokens vacíos o sin secreto válido', () => {
  assert.equal(tokenValido(undefined, 100, fecha, secreto), false);
  assert.throws(() => tokenDeReserva(100, fecha, 'corto'));
});
