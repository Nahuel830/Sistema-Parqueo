function manejadorErrores(error, req, res, next) {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      mensaje: 'El cuerpo de la solicitud no es un JSON válido',
    });
  }

  const erroresDeConexion = [
    'ECONNREFUSED',
    'ER_ACCESS_DENIED_ERROR',
    'ER_BAD_DB_ERROR',
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
  ];

  if (erroresDeConexion.includes(error.code)) {
    console.error('Error de conexión con MySQL:', error.code);
    return res.status(503).json({
      ok: false,
      mensaje: 'No se pudo conectar a la base de datos',
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
