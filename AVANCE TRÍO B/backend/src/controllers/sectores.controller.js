const asyncHandler = require('../utils/asyncHandler');
const {
  listarSectores,
  buscarSectorPorId,
  listarLugaresPorSector,
} = require('../models/sector.model');

const listar = asyncHandler(async (req, res) => {
  const sectores = await listarSectores();
  res.json({
    ok: true,
    mensaje: 'Sectores obtenidos correctamente',
    datos: sectores,
  });
});

const listarLugares = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El identificador del sector debe ser un número entero positivo',
    });
  }

  const sector = await buscarSectorPorId(id);

  if (!sector) {
    return res.status(404).json({
      ok: false,
      mensaje: 'Sector no encontrado',
    });
  }

  const lugares = await listarLugaresPorSector(id);

  res.json({
    ok: true,
    mensaje: 'Lugares del sector obtenidos correctamente',
    datos: { sector, lugares },
  });
});

module.exports = { listar, listarLugares };
