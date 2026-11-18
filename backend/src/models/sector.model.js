const { pool } = require('../config/db');

async function listarSectores() {
  const [filas] = await pool.execute(
    `SELECT s.id_sector AS id,
            s.nombre,
            s.descripcion,
            s.total_lugares AS totalLugares,
            (SELECT COUNT(*) FROM LUGAR l
              WHERE l.id_sector = s.id_sector AND l.activo = 1 AND l.estado = 'LIBRE') AS lugaresLibres
       FROM SECTOR s
      WHERE s.activo = 1
      ORDER BY s.nombre`
  );
  return filas;
}

async function buscarSectorPorId(id) {
  const [filas] = await pool.execute(
    `SELECT id_sector AS id,
            nombre,
            descripcion,
            total_lugares AS totalLugares
       FROM SECTOR
      WHERE id_sector = ? AND activo = 1
      LIMIT 1`,
    [id]
  );
  return filas[0] || null;
}

async function listarLugaresPorSector(idSector) {
  const [filas] = await pool.execute(
    `SELECT id_lugar AS id,
            numero,
            estado
       FROM LUGAR
      WHERE id_sector = ? AND activo = 1
      ORDER BY numero`,
    [idSector]
  );
  return filas;
}

module.exports = { listarSectores, buscarSectorPorId, listarLugaresPorSector };
