const { crearApp } = require('./app');
const { config } = require('./config/env');
const { cerrarPool } = require('./config/db');

const app = crearApp();

const servidor = app.listen(config.puerto, () => {
  console.log(
    `API del Sistema de Parqueo escuchando en http://localhost:${config.puerto} (${config.entorno}, zona ${config.zonaHoraria})`
  );
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
