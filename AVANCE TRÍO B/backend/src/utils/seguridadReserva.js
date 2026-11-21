const crypto = require('node:crypto');

// Token para un conductor sin login. No almacena datos sensibles en el navegador
// aparte del token temporal (cinco minutos), ni requiere cambiar el esquema SQL.
function tokenDeReserva(idReserva, fechaInicio, secreto) {
  if (!secreto || String(secreto).length < 32) {
    throw new Error('Se requiere un secreto de al menos 32 caracteres');
  }
  const marca = new Date(fechaInicio).getTime();
  if (!Number.isFinite(marca)) throw new Error('Fecha de inicio inválida');
  return crypto
    .createHmac('sha256', secreto)
    .update(`reserva:v1:${idReserva}:${marca}`)
    .digest('hex');
}

function tokenValido(token, idReserva, fechaInicio, secreto) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  const esperado = tokenDeReserva(idReserva, fechaInicio, secreto);
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(esperado, 'hex'));
}

module.exports = { tokenDeReserva, tokenValido };
