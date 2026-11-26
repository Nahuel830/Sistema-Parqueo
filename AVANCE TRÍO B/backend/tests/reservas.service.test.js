process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  crearReserva,
  obtenerReserva,
  cancelarReserva,
  DURACION_MINUTOS,
} = require('../src/services/reservas.service');
const { pool } = require('../src/config/db');

test.after(async () => {
  await pool.end();
});

test('crearReserva_SinIdLugar_Rechaza400', async () => {
  // Arrange
  const datos = {};

  // Act & Assert
  await assert.rejects(
    () => crearReserva(datos),
    (e) => e.status === 400 && /idLugar/.test(e.message)
  );
});

test('crearReserva_IdLugarNoNumerico_Rechaza400', async () => {
  // Arrange
  const datos = { idLugar: 'abc' };

  // Act & Assert
  await assert.rejects(
    () => crearReserva(datos),
    (e) => e.status === 400 && /idLugar/.test(e.message)
  );
});

test('crearReserva_IdLugarCero_Rechaza400', async () => {
  // Arrange
  const datos = { idLugar: 0 };

  // Act & Assert
  await assert.rejects(
    () => crearReserva(datos),
    (e) => e.status === 400 && /idLugar/.test(e.message)
  );
});

test('crearReserva_PlacaNoTexto_Rechaza400', async () => {
  // Arrange
  const datos = { idLugar: 5, placa: 12345 };

  // Act & Assert
  await assert.rejects(
    () => crearReserva(datos),
    (e) => e.status === 400 && /placa/i.test(e.message)
  );
});

test('crearReserva_PlacaConCaracteresInvalidos_Rechaza400', async () => {
  // Arrange
  const datos = { idLugar: 5, placa: '!!!' };

  // Act & Assert
  await assert.rejects(
    () => crearReserva(datos),
    (e) => e.status === 400 && /placa/i.test(e.message)
  );
});

test('crearReserva_PlacaDemasiadoLarga_Rechaza400', async () => {
  // Arrange
  const datos = { idLugar: 5, placa: 'A'.repeat(20) };

  // Act & Assert
  await assert.rejects(
    () => crearReserva(datos),
    (e) => e.status === 400 && /placa/i.test(e.message)
  );
});

test('obtenerReserva_IdInvalido_Rechaza400', async () => {
  // Arrange
  const id = 'no-es-un-numero';

  // Act & Assert
  await assert.rejects(
    () => obtenerReserva(id, 'token'),
    (e) => e.status === 400 && /[Ii]dentificador/.test(e.message)
  );
});

test('obtenerReserva_IdNegativo_Rechaza400', async () => {
  // Arrange
  const id = -3;

  // Act & Assert
  await assert.rejects(
    () => obtenerReserva(id, 'token'),
    (e) => e.status === 400
  );
});

test('cancelarReserva_IdInvalido_Rechaza400', async () => {
  // Arrange
  const id = 'xyz';

  // Act & Assert
  await assert.rejects(
    () => cancelarReserva(id, 'token'),
    (e) => e.status === 400
  );
});

test('DURACION_MINUTOS_EsCinco', () => {
  // Arrange
  // (constante del módulo)

  // Act
  const duracion = DURACION_MINUTOS;

  // Assert
  assert.equal(duracion, 5);
});
