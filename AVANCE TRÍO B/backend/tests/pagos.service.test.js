process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciarPago, confirmarPagoQr } = require('../src/services/pagos.service');
const { pool } = require('../src/config/db');

test.after(async () => {
  await pool.end();
});

test('iniciarPago_MetodoInvalido_Rechaza400', async () => {
  // Arrange
  const id = '1';
  const token = 'token-cualquiera';
  const metodo = 'TARJETA';

  // Act & Assert
  await assert.rejects(
    () => iniciarPago(id, token, metodo),
    (e) => e.status === 400 && /QR o EFECTIVO/.test(e.message)
  );
});

test('iniciarPago_MetodoMinusculas_SeNormaliza', async () => {
  // Arrange: 'qr' en minúsculas pasa la validación; falla después al no
  // encontrar la reserva en la base de datos (aquí no hay BD disponible).
  // Solo verificamos que NO rechaza por validación de método.
  const id = 'abc'; // forzará error 400 de id antes de tocar la BD
  const token = 'token';

  // Act & Assert: el error esperado es de identificador inválido (400),
  // lo que confirma que 'qr' fue aceptado como método válido.
  await assert.rejects(
    () => iniciarPago(id, token, 'qr'),
    (e) => e.status === 400 && /[Ii]dentificador/.test(e.message)
  );
});

test('iniciarPago_IdInvalido_Rechaza400', async () => {
  // Arrange
  const id = 'no-numero';
  const token = 'token';
  const metodo = 'QR';

  // Act & Assert
  await assert.rejects(
    () => iniciarPago(id, token, metodo),
    (e) => e.status === 400
  );
});

test('confirmarPagoQr_ReferenciaInvalida_Rechaza400', async () => {
  // Arrange
  const referencia = 'no-es-una-referencia-valida';

  // Act & Assert
  await assert.rejects(
    () => confirmarPagoQr(referencia),
    (e) => e.status === 400 && /[Rr]eferencia/.test(e.message)
  );
});

test('confirmarPagoQr_ReferenciaConMayusculas_Rechaza400', async () => {
  // Arrange: 24 hex válidos pero en mayúsculas no cumple el regex [a-f0-9]
  const referencia = 'A'.repeat(24);

  // Act & Assert
  await assert.rejects(
    () => confirmarPagoQr(referencia),
    (e) => e.status === 400
  );
});

test('confirmarPagoQr_ReferenciaMuyCorta_Rechaza400', async () => {
  // Arrange
  const referencia = 'abc123';

  // Act & Assert
  await assert.rejects(
    () => confirmarPagoQr(referencia),
    (e) => e.status === 400
  );
});
