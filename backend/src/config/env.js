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

const config = {
  entorno: process.env.NODE_ENV || 'development',
  puerto: numero(process.env.PORT, 3000),
  corsOrigen: lista(process.env.CORS_ORIGIN, 'http://localhost:5173'),
  zonaHoraria: process.env.TZ,
  jwt: {
    secreto: secretoJwt,
    expiracion: process.env.JWT_EXPIRES_IN || '2h',
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
