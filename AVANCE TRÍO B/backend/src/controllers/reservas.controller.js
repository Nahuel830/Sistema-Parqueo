const asyncHandler = require('../utils/asyncHandler');
const {
  crearReserva,
  obtenerReserva,
  cancelarReserva,
} = require('../services/reservas.service');

const crear = asyncHandler(async (req, res) => {
  const datos = await crearReserva(req.body || {});
  res.status(201).json({ ok: true, mensaje: 'Lugar reservado por cinco minutos', datos });
});

const consultar = asyncHandler(async (req, res) => {
  const reserva = await obtenerReserva(req.params.id, req.get('x-reserva-token'));
  res.json({ ok: true, mensaje: 'Reserva consultada correctamente', datos: reserva });
});

const cancelar = asyncHandler(async (req, res) => {
  const resultado = await cancelarReserva(req.params.id, req.get('x-reserva-token'));
  res.status(resultado.codigo).json({
    ok: resultado.codigo === 200,
    mensaje: resultado.mensaje,
    ...(resultado.datos ? { datos: resultado.datos } : {}),
  });
});

module.exports = { crear, consultar, cancelar };
