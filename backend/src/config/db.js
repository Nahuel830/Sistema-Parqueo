const mysql = require('mysql2/promise');
const { config } = require('./env');

const pool = mysql.createPool({
  host: config.bd.host,
  port: config.bd.puerto,
  user: config.bd.usuario,
  password: config.bd.contrasena,
  database: config.bd.nombre,
  waitForConnections: true,
  connectionLimit: config.bd.maximoConexiones,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: config.bd.zonaHoraria,
  decimalNumbers: true,
});

async function probarConexion() {
  const conexion = await pool.getConnection();
  try {
    await conexion.ping();
  } finally {
    conexion.release();
  }
}

async function cerrarPool() {
  await pool.end();
}

module.exports = { pool, probarConexion, cerrarPool };
