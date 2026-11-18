const { Pool } = require('pg');
const { config } = require('./env');

const pool = new Pool({
  host: config.bd.host,
  port: config.bd.puerto,
  user: config.bd.usuario,
  password: config.bd.contrasena,
  database: config.bd.nombre,
  max: config.bd.maximoConexiones,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.bd.ssl ? { rejectUnauthorized: false } : false,
  options: `-c timezone=${config.zonaHoraria}`,
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});

async function probarConexion() {
  await pool.query('SELECT 1');
}

async function cerrarPool() {
  await pool.end();
}

module.exports = { pool, probarConexion, cerrarPool };
