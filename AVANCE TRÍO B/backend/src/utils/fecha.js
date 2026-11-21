const { config } = require('../config/env');

const formatoBolivia = new Intl.DateTimeFormat('es-BO', {
  timeZone: config.zonaHoraria,
  dateStyle: 'short',
  timeStyle: 'medium',
});

function formatearEnBolivia(fecha = new Date()) {
  return formatoBolivia.format(fecha);
}

function sumarMinutos(fecha, minutos) {
  return new Date(fecha.getTime() + minutos * 60 * 1000);
}

module.exports = { formatearEnBolivia, sumarMinutos };
