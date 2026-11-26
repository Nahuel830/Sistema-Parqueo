const test = require('node:test');
const assert = require('node:assert/strict');
const { tokenDeReserva, tokenValido } = require('../src/utils/seguridadReserva');

// Variables globales para el escenario de prueba (Test Fixtures)
const SECRETO_PRUEBA = '1234567890abcdefghijklmnopqrstuvWXYZ';
const FECHA_RESERVA = new Date('2026-11-19T19:00:00.000Z');

test('Debería generar un token válido de 64 caracteres para un conductor y fecha específicos', () => {
  // Arrange (Preparar): Definimos los datos de entrada
  const idConductor = 100;

  // Act (Actuar): Ejecutamos la función bajo prueba (System Under Test)
  const tokenGenerado = tokenDeReserva(idConductor, FECHA_RESERVA, SECRETO_PRUEBA);
  const esTokenValido = tokenValido(tokenGenerado, idConductor, FECHA_RESERVA, SECRETO_PRUEBA);

  // Assert (Afirmar): Verificamos que el resultado sea el esperado
  assert.equal(tokenGenerado.length, 64, 'El token debe tener exactamente 64 caracteres');
  assert.ok(esTokenValido, 'El token generado debe ser reconocido como válido');
});

test('Debería rechazar un token si el ID del conductor no coincide', () => {
  // Arrange (Preparar)
  const idConductorReal = 100;
  const idConductorFalso = 101; // Simulamos a otro conductor intentando usar el token
  const tokenOriginal = tokenDeReserva(idConductorReal, FECHA_RESERVA, SECRETO_PRUEBA);

  // Act (Actuar)
  const esValidoParaOtroConductor = tokenValido(tokenOriginal, idConductorFalso, FECHA_RESERVA, SECRETO_PRUEBA);

  // Assert (Afirmar)
  assert.equal(esValidoParaOtroConductor, false, 'El token no debe ser válido para un conductor diferente');
});

test('Debería lanzar un error si el secreto es demasiado corto al generar el token', () => {
  // Arrange (Preparar)
  const secretoInvalido = 'corto';

  // Act & Assert (Actuar y Afirmar juntos por ser una prueba de excepción)
  assert.throws(
    () => tokenDeReserva(100, FECHA_RESERVA, secretoInvalido),
    /Se requiere un secreto de al menos 32 caracteres/, // <--- CORREGIDO AQUÍ
    'Debería fallar si el secreto es muy corto'
  );
});