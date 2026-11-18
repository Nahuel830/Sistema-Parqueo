function manejadorErrores(error, req, res, next) {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      mensaje: 'El cuerpo de la solicitud no es un JSON válido',
    });
  }

  const estado = error.status || 500;

  if (estado >= 500) {
    console.error('Error no controlado:', error);
  }

  return res.status(estado).json({
    ok: false,
    mensaje: estado >= 500 ? 'Error interno del servidor' : error.message,
  });
}

module.exports = { manejadorErrores };
