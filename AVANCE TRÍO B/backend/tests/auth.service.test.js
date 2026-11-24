process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciarSesion, datosPublicos } = require('../src/services/auth.service');
const { pool } = require('../src/config/db');

test.after(async () => {
  await pool.end();
});

test('iniciarSesion_UsernameVacio_Rechaza400', async () => {
  // Arrange
  const username = '   ';
  const password = 'clave123';

  // Act & Assert
  await assert.rejects(
    () => iniciarSesion(username, password),
    (e) => e.status === 400
  );
});

test('iniciarSesion_PasswordNoTexto_Rechaza400', async () => {
  // Arrange
  const username = 'admin';
  const password = 123456;

  // Act & Assert
  await assert.rejects(
    () => iniciarSesion(username, password),
    (e) => e.status === 400
  );
});

test('iniciarSesion_UsernameMuyLargo_Rechaza400', async () => {
  // Arrange
  const username = 'u'.repeat(41);
  const password = 'clave123';

  // Act & Assert
  await assert.rejects(
    () => iniciarSesion(username, password),
    (e) => e.status === 400
  );
});

test('iniciarSesion_PasswordMuyLarga_Rechaza400', async () => {
  // Arrange
  const username = 'admin';
  const password = 'p'.repeat(73);

  // Act & Assert
  await assert.rejects(
    () => iniciarSesion(username, password),
    (e) => e.status === 400
  );
});

test('datosPublicos_MapeaLosCamposCorrectos', () => {
  // Arrange
  const usuarioBd = {
    id_usuario: 7,
    nombre_completo: 'Encargado Uno',
    username: 'enc1',
    rol: 'ENCARGADO',
    id_sector: 2,
    password_hash: 'no-debe-exponerse',
    activo: true,
  };

  // Act
  const publico = datosPublicos(usuarioBd);

  // Assert
  assert.deepEqual(publico, {
    id: 7,
    nombre: 'Encargado Uno',
    username: 'enc1',
    rol: 'ENCARGADO',
    idSector: 2,
  });
  assert.equal(publico.password_hash, undefined);
});
