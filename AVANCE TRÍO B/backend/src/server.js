const { crearApp } = require('./app');
const { config } = require('./config/env');
const { cerrarPool } = require('./config/db');

const app = crearApp();

const servidor = app.listen(config.puerto, () => {
  console.log(
    `API del Sistema de Parqueo escuchando en http://localhost:${config.puerto} (${config.entorno}, zona ${config.zonaHoraria})`
  );
});

servidor.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `El puerto ${config.puerto} ya está en uso. Cierra el proceso que lo ocupa o cambia PORT en el archivo .env.`
    );
    process.exit(1);
  }
  throw error;
});

async function cerrar(senal) {
  console.log(`\n${senal} recibido: cerrando la API...`);
  servidor.close(async () => {
    try {
      await cerrarPool();
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => cerrar('SIGINT'));
process.on('SIGTERM', () => cerrar('SIGTERM'));
