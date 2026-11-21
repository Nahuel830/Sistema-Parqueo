const crypto = require('node:crypto');
const asyncHandler = require('../utils/asyncHandler');
const { config } = require('../config/env');
const { iniciarPago, confirmarPagoQr, obtenerFichaDeReserva } = require('../services/pagos.service');

function responder(res, resultado) {
  res.status(resultado.codigo).json({
    ok: resultado.codigo < 300,
    mensaje: resultado.mensaje,
    ...(resultado.datos ? { datos: resultado.datos } : {}),
  });
}

const pagar = asyncHandler(async (req, res) => {
  const resultado = await iniciarPago(req.params.id, req.get('x-reserva-token'), (req.body || {}).metodo);
  responder(res, resultado);
});

const ficha = asyncHandler(async (req, res) => {
  const datos = await obtenerFichaDeReserva(req.params.id, req.get('x-reserva-token'));
  res.json({ ok: true, mensaje: 'Ficha consultada correctamente', datos });
});

function secretoValido(recibido) {
  const esperado = config.pasarela.secreto;
  if (!recibido || !esperado) return false;
  const a = crypto.createHash('sha256').update(String(recibido)).digest();
  const b = crypto.createHash('sha256').update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
}

// Callback del banco/pasarela: protegido con un secreto compartido.
const confirmarQr = asyncHandler(async (req, res) => {
  if (!config.pasarela.secreto) {
    return res.status(503).json({ ok: false, mensaje: 'La confirmación de pagos QR no está configurada' });
  }
  if (!secretoValido(req.get('x-pasarela-secret'))) {
    return res.status(403).json({ ok: false, mensaje: 'No autorizado para confirmar pagos' });
  }
  const resultado = await confirmarPagoQr((req.body || {}).referencia);
  return responder(res, resultado);
});

module.exports = { pagar, ficha, confirmarQr };
