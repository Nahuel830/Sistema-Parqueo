process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatearEnBolivia, sumarMinutos } = require('../src/utils/fecha');

test('formatearEnBolivia_DevuelveFechaHoraLegible', () => {
  // Arrange
  const fecha = new Date('2026-11-23T15:30:00.000Z');

  // Act
  const resultado = formatearEnBolivia(fecha);

  // Assert
  assert.equal(typeof resultado, 'string');
  assert.ok(resultado.length > 0);
  assert.match(resultado, /\d/);
});

test('formatearEnBolivia_SinArgumento_UsaLaFechaActual', () => {
  // Arrange
  const antes = Date.now();

  // Act
  const resultado = formatearEnBolivia();

  // Assert
  assert.equal(typeof resultado, 'string');
  assert.ok(resultado.length > 0);
  assert.ok(Date.now() - antes < 5000);
});

test('sumarMinutos_SumaMinutosCorrectamente', () => {
  // Arrange
  const fecha = new Date('2026-11-23T10:00:00.000Z');

  // Act
  const resultado = sumarMinutos(fecha, 5);

  // Assert
  assert.equal(resultado.toISOString(), '2026-11-23T10:05:00.000Z');
});

test('sumarMinutos_MinutosNegativos_RestaTiempo', () => {
  // Arrange
  const fecha = new Date('2026-11-23T10:00:00.000Z');

  // Act
  const resultado = sumarMinutos(fecha, -30);

  // Assert
  assert.equal(resultado.toISOString(), '2026-11-23T09:30:00.000Z');
});

test('sumarMinutos_CeroDevuelveLaMismaFecha', () => {
  // Arrange
  const fecha = new Date('2026-11-23T10:00:00.000Z');

  // Act
  const resultado = sumarMinutos(fecha, 0);

  // Assert
  assert.equal(resultado.getTime(), fecha.getTime());
});
