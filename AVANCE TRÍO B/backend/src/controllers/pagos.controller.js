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

// El webhook solo dispara la verificación servidor a servidor en Red Enlace.
const confirmarQr = asyncHandler(async (req, res) => {
  const { proveedor, secreto } = config.pasarela;
  if (proveedor === 'deshabilitada' || !secreto) {
    return res.status(503).json({ ok: false, mensaje: 'La confirmación de pagos QR no está configurada' });
  }
  if (!secretoValido(req.get('x-pasarela-secret'))) {
    return res.status(403).json({ ok: false, mensaje: 'No autorizado para confirmar pagos' });
  }
  if (proveedor === 'redenlace') {
    const referencia = req.body?.data?.numeroReferencia ?? req.body?.numeroReferencia;
    const resultado = await confirmarPagoQr(referencia, 'RED_ENLACE');
    return res.status(resultado.codigo).json({ ok: resultado.codigo === 200, mensaje: resultado.mensaje });
  }
  const resultado = await confirmarPagoQr(req.body?.referencia);
  return responder(res, resultado);
});

module.exports = { pagar, ficha, confirmarQr };
