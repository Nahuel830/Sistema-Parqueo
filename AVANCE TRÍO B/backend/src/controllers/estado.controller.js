const { config } = require('../config/env');
const { probarConexion } = require('../config/db');
const { formatearEnBolivia } = require('../utils/fecha');

function obtenerEstado(req, res) {
  res.json({
    ok: true,
    mensaje: 'API del Sistema de Parqueo operativa',
    entorno: config.entorno,
    zonaHoraria: config.zonaHoraria,
    fechaHora: formatearEnBolivia(new Date()),
  });
}

async function obtenerEstadoBd(req, res) {
  try {
    await probarConexion();
    res.json({ ok: true, mensaje: 'Conexión a PostgreSQL establecida' });
  } catch (error) {
    res.status(503).json({
      ok: false,
      mensaje: 'No se pudo conectar a PostgreSQL',
      detalle: error.code || error.message,
    });
  }
}

module.exports = { obtenerEstado, obtenerEstadoBd };
