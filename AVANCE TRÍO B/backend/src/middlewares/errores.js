function manejadorErrores(error, req, res, next) {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      mensaje: 'El cuerpo de la solicitud no es un JSON válido',
    });
  }

  const erroresDeConexion = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    '08001',
    '08006',
    '28P01',
    '3D000',
    '57P03',
  ];

  if (erroresDeConexion.includes(error.code)) {
    const pistas = {
      '28P01': 'Revisa DB_PASSWORD en backend/.env y que PostgreSQL esté encendido.',
      '3D000': 'La base de datos no existe. Créala y aplica db/schema.sql.',
      '57P03': 'PostgreSQL está iniciando. Espera unos segundos y vuelve a intentarlo.',
      ECONNREFUSED: 'No se pudo conectar a PostgreSQL. Verifica que el servicio esté corriendo en el puerto indicado en backend/.env.',
    };
    const pista = pistas[error.code] || 'Revisa la configuración de la base de datos en backend/.env.';
    console.error(`\n[BD] Error ${error.code}: ${pista}`);
    return res.status(503).json({
      ok: false,
      mensaje: 'No se pudo conectar a la base de datos',
    });
  }

  if (error.code === 'PASARELA_NO_DISPONIBLE') {
    return res.status(503).json({ ok: false, mensaje: error.message });
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
