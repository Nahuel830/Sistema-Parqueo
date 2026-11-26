const path = require('path');

require('dotenv').config({
  path: process.env.RUTA_ENV || path.resolve(__dirname, '../../.env'),
  quiet: true,
});

process.env.TZ = process.env.TZ || 'America/La_Paz';

function numero(valor, defecto) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : defecto;
}

function lista(valor, defecto) {
  return (valor || defecto)
    .split(',')
    .map((elemento) => elemento.trim())
    .filter(Boolean);
}

const secretoJwt = process.env.JWT_SECRET || '';

if (secretoJwt.length < 32) {
  throw new Error(
    'JWT_SECRET es obligatorio y debe tener al menos 32 caracteres. Copia backend/.env.example a backend/.env y define un secreto.'
  );
}

const secretoPasarela = process.env.PASARELA_SECRET || '';
if (secretoPasarela && secretoPasarela.length < 16) {
  throw new Error('PASARELA_SECRET debe tener al menos 16 caracteres.');
}

const entorno = process.env.NODE_ENV || 'development';
const proveedor = process.env.PASARELA_PROVEEDOR || (entorno !== 'production' && secretoPasarela ? 'simulada' : 'deshabilitada');
if (!['deshabilitada', 'simulada', 'redenlace'].includes(proveedor) || (entorno === 'production' && proveedor === 'simulada')) {
  throw new Error('PASARELA_PROVEEDOR debe ser deshabilitada o redenlace. Simulada solo se admite fuera de producción.');
}
const redEnlace = {
  base: process.env.REDENLACE_URL,
  basic: process.env.REDENLACE_BASIC,
  cliente: process.env.REDENLACE_CLIENT_ID,
  establecimiento: Number(process.env.REDENLACE_ID_ESTABLECIMIENTO),
  nombre: process.env.REDENLACE_NOMBRE_ESTABLECIMIENTO,
  webhook: process.env.REDENLACE_WEBHOOK_URL,
};
if (proveedor === 'redenlace') {
  if (!secretoPasarela || !redEnlace.basic || !redEnlace.cliente || !redEnlace.nombre
      || !Number.isSafeInteger(redEnlace.establecimiento) || redEnlace.establecimiento <= 0) {
    throw new Error('Completa PASARELA_SECRET y los datos del establecimiento Red Enlace.');
  }
  for (const valor of [redEnlace.base, redEnlace.webhook]) {
    let url;
    try { url = new URL(valor); } catch { /* Se informa la configuración inválida abajo. */ }
    if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('REDENLACE_URL y REDENLACE_WEBHOOK_URL deben ser URL HTTPS válidas.');
    }
  }
}

const config = {
  entorno,
  puerto: numero(process.env.PORT, 3000),
  corsOrigen: lista(process.env.CORS_ORIGIN, 'http://localhost:5173'),
  zonaHoraria: process.env.TZ,
  jwt: {
    secreto: secretoJwt,
    expiracion: process.env.JWT_EXPIRES_IN || '2h',
  },
  pasarela: {
    secreto: secretoPasarela,
    proveedor,
    redEnlace,
  },
  bcryptRondas: numero(process.env.BCRYPT_ROUNDS, 10),
  bd: {
    host: process.env.DB_HOST || '127.0.0.1',
    puerto: numero(process.env.DB_PORT, 5432),
    usuario: process.env.DB_USER || 'postgres',
    contrasena: process.env.DB_PASSWORD || '',
    nombre: process.env.DB_NAME || 'parqueo_tarija',
    maximoConexiones: numero(process.env.DB_POOL_MAX, 10),
    ssl: process.env.DB_SSL === 'true',
  },
};

module.exports = { config };
