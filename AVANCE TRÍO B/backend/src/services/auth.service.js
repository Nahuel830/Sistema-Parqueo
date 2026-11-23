const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { config } = require('../config/env');
const { errorHttp } = require('../utils/http');

// Hash de relleno: si el usuario no existe se compara igual contra este hash,
// para que el tiempo de respuesta no revele qué usuarios existen.
const HASH_RELLENO = bcrypt.hashSync('relleno-para-igualar-tiempos', config.bcryptRondas);

function datosPublicos(u) {
  return { id: u.id_usuario, nombre: u.nombre_completo, username: u.username, rol: u.rol, idSector: u.id_sector };
}

async function iniciarSesion(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string'
    || !username.trim() || !password || username.length > 40 || password.length > 72) {
    throw errorHttp(400, 'Escribe tu usuario y tu contraseña');
  }
  const usuarioNorm = username.trim();

  const { rows } = await pool.query(
    `SELECT id_usuario, id_sector, nombre_completo, username, password_hash, rol
       FROM usuario WHERE username = $1 AND activo = TRUE`,
    [usuarioNorm]
  );
  const u = rows[0];
  const coincide = await bcrypt.compare(password, u ? u.password_hash : HASH_RELLENO);
  if (!u || !coincide) throw errorHttp(401, 'Usuario o contraseña incorrectos');

  const token = jwt.sign(
    { rol: u.rol, idSector: u.id_sector, username: u.username },
    config.jwt.secreto,
    { algorithm: 'HS256', subject: String(u.id_usuario), expiresIn: config.jwt.expiracion }
  );
  await pool.query(
    `INSERT INTO bitacora (id_usuario, entidad, id_entidad, accion, estado_anterior, estado_nuevo)
     VALUES ($1, 'USUARIO', $1, 'INICIO_DE_SESION', NULL, 'SESION_INICIADA')`,
    [u.id_usuario]
  );
  return { token, tipo: 'Bearer', expiraEn: config.jwt.expiracion, usuario: datosPublicos(u) };
}

// Se usa en cada petición autenticada: un usuario desactivado pierde el acceso de inmediato.
async function buscarUsuarioActivo(id) {
  const { rows } = await pool.query(
    `SELECT id_usuario, id_sector, nombre_completo, username, rol
       FROM usuario WHERE id_usuario = $1 AND activo = TRUE`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { iniciarSesion, buscarUsuarioActivo, datosPublicos };
