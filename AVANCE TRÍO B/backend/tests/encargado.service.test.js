process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../src/services/encargado.service');
const { pool } = require('../src/config/db');

test.after(async () => {
  await pool.end();
});

const usuario = { id: 7, rol: 'ENCARGADO', idSector: 2, nombre: 'Encargado Prueba' };

test('listarFichas_EstadoInvalido_Rechaza400', async () => {
  // Arrange
  const filtros = { estado: 'BORRADA' };

  // Act & Assert
  await assert.rejects(
    () => s.listarFichas(usuario, filtros),
    (e) => e.status === 400 && /estado/i.test(e.message)
  );
});

test('listarFichas_EstadoValidoMinusculas_SeNormaliza', async () => {
  // Arrange: 'emitida' en minúsculas pasa la validación de estado;
  // la consulta a la BD fallará por falta de conexión, lo que confirma
  // que el filtro fue aceptado (no es un error 400).
  // Usamos fecha inválida para forzar un 400 distinto y verificar orden:
  // en realidad probamos que un estado válido NO produce error de validación
  // esperando cualquier error que NO sea de validación de estado.
  // Como no hay BD, esto lanzará error de conexión; lo importante es
  // que no sea el 400 de estado inválido.
  try {
    // Act
    await s.listarFichas(usuario, { estado: 'emitida' });
    assert.fail('debería fallar por falta de BD');
  } catch (e) {
    // Assert
    assert.notEqual(e.status, 400);
  }
});

test('listarFichas_FechaConFormatoInvalido_Rechaza400', async () => {
  // Arrange
  const filtros = { fecha: '19/11/2026' };

  // Act & Assert
  await assert.rejects(
    () => s.listarFichas(usuario, filtros),
    (e) => e.status === 400 && /[Ff]echa/.test(e.message)
  );
});

test('obtenerFicha_CodigoInvalido_Rechaza400', async () => {
  // Arrange
  const codigo = 'codigo-que-no-es-valido';

  // Act & Assert
  await assert.rejects(
    () => s.obtenerFicha(usuario, codigo),
    (e) => e.status === 400 && /código/i.test(e.message)
  );
});

test('cobrarEfectivo_CodigoInvalido_Rechaza400', async () => {
  // Arrange
  const codigo = 'PQ-123'; // formato corto, no cumple el regex

  // Act & Assert
  await assert.rejects(
    () => s.cobrarEfectivo(usuario, codigo),
    (e) => e.status === 400
  );
});

test('verificarFicha_CodigoInvalido_Rechaza400', async () => {
  // Arrange
  const codigo = 'basura';

  // Act & Assert
  await assert.rejects(
    () => s.verificarFicha(usuario, codigo),
    (e) => e.status === 400
  );
});

test('marcarFichaPagada_CodigoInvalido_Rechaza400', async () => {
  // Arrange
  const codigo = 'basura';

  // Act & Assert
  await assert.rejects(
    () => s.marcarFichaPagada(usuario, codigo),
    (e) => e.status === 400
  );
});

test('marcarNotificacionLeida_IdInvalido_Rechaza400', async () => {
  // Arrange
  const id = 'no-es-numero';

  // Act & Assert
  await assert.rejects(
    () => s.marcarNotificacionLeida(usuario, id),
    (e) => e.status === 400 && /[Ii]dentificador/.test(e.message)
  );
});
