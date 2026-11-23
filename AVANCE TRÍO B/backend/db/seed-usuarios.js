// Crea usuarios iniciales: 1 administrador y 1 encargado por sector.
// Las contraseñas se toman de SEED_PASSWORD_ADMIN y SEED_PASSWORD_ENCARGADO; si no
// están definidas se generan al azar y se muestran UNA sola vez. Nunca se guardan en el código.
// Uso:  npm run seed:usuarios
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { pool, cerrarPool } = require('../src/config/db');
const { config } = require('../src/config/env');

function clave(nombre) {
  return process.env[nombre] || crypto.randomBytes(9).toString('base64url');
}

async function crear(cliente, { username, nombre, rol, idSector, contrasena }) {
  const hash = await bcrypt.hash(contrasena, config.bcryptRondas);
  const { rowCount } = await cliente.query(
    `INSERT INTO usuario (id_sector, nombre_completo, username, password_hash, rol)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING`,
    [idSector, nombre, username, hash, rol]
  );
  return rowCount === 1;
}

async function main() {
  const passAdmin = clave('SEED_PASSWORD_ADMIN');
  const passEncargado = clave('SEED_PASSWORD_ENCARGADO');
  const cliente = await pool.connect();
  const resumen = [];
  try {
    await cliente.query('BEGIN');
    const nuevoAdmin = await crear(cliente, { username: 'admin', nombre: 'Administrador del sistema', rol: 'ADMIN', idSector: null, contrasena: passAdmin });
    resumen.push({ usuario: 'admin', rol: 'ADMIN', contrasena: nuevoAdmin ? passAdmin : '(ya existía)' });
    const { rows: sectores } = await cliente.query('SELECT id_sector, nombre FROM sector WHERE activo = TRUE ORDER BY id_sector');
    for (const s of sectores) {
      const username = `encargado${s.id_sector}`;
      const nuevo = await crear(cliente, { username, nombre: `Encargado ${s.nombre}`, rol: 'ENCARGADO', idSector: s.id_sector, contrasena: passEncargado });
      resumen.push({ usuario: username, rol: `ENCARGADO (${s.nombre})`, contrasena: nuevo ? passEncargado : '(ya existía)' });
    }
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
  console.table(resumen);
  console.log('Guarda estas contraseñas ahora: no se vuelven a mostrar.');
}

main().catch((e) => { console.error('No se pudieron crear los usuarios:', e.message); process.exitCode = 1; }).finally(cerrarPool);
