const asyncHandler = require('../utils/asyncHandler');
const s = require('../services/encargado.service');

function responder(res, r) {
  res.status(r.codigo).json({ ok: r.codigo < 300, mensaje: r.mensaje, ...(r.datos ? { datos: r.datos } : {}) });
}

const lugares = asyncHandler(async (req, res) => {
  res.json({ ok: true, mensaje: 'Lugares de tu sector', datos: await s.listarLugares(req.usuario) });
});
const fichas = asyncHandler(async (req, res) => {
  res.json({ ok: true, mensaje: 'Fichas de tu sector', datos: await s.listarFichas(req.usuario, req.query) });
});
const ficha = asyncHandler(async (req, res) => {
  res.json({ ok: true, mensaje: 'Detalle de la ficha', datos: await s.obtenerFicha(req.usuario, req.params.codigo) });
});
const cobrar = asyncHandler(async (req, res) => responder(res, await s.cobrarEfectivo(req.usuario, req.params.codigo)));
const verificar = asyncHandler(async (req, res) => responder(res, await s.verificarFicha(req.usuario, req.params.codigo)));
const pagada = asyncHandler(async (req, res) => responder(res, await s.marcarFichaPagada(req.usuario, req.params.codigo)));
const notificaciones = asyncHandler(async (req, res) => {
  const datos = await s.listarNotificaciones(req.usuario, { soloNoLeidas: req.query.noLeidas === 'true' });
  res.json({ ok: true, mensaje: 'Notificaciones', datos });
});
const leida = asyncHandler(async (req, res) => {
  res.json({ ok: true, mensaje: 'Notificación marcada como leída', datos: await s.marcarNotificacionLeida(req.usuario, req.params.id) });
});

module.exports = { lugares, fichas, ficha, cobrar, verificar, pagada, notificaciones, leida };
