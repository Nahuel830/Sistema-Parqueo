const { pool } = require('../config/db');

async function listarSectores() {
  const { rows } = await pool.query(
    `SELECT s.id_sector AS id,
            s.nombre,
            s.descripcion,
            s.total_lugares AS "totalLugares",
            (SELECT COUNT(*)::int FROM lugar l
              WHERE l.id_sector = s.id_sector AND l.activo = TRUE AND l.estado = 'LIBRE') AS "lugaresLibres"
       FROM sector s
      WHERE s.activo = TRUE
      ORDER BY s.nombre`
  );
  return rows;
}

async function buscarSectorPorId(id) {
  const { rows } = await pool.query(
    `SELECT id_sector AS id,
            nombre,
            descripcion,
            total_lugares AS "totalLugares"
       FROM sector
      WHERE id_sector = $1 AND activo = TRUE
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function listarLugaresPorSector(idSector) {
  const { rows } = await pool.query(
    `SELECT id_lugar AS id,
            numero,
            estado
       FROM lugar
      WHERE id_sector = $1 AND activo = TRUE
      ORDER BY numero`,
    [idSector]
  );
  return rows;
}

module.exports = { listarSectores, buscarSectorPorId, listarLugaresPorSector };
