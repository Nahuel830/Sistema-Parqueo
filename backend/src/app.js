const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('./config/env');
const rutas = require('./routes');
const { noEncontrado } = require('./middlewares/noEncontrado');
const { manejadorErrores } = require('./middlewares/errores');

function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigen }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use('/api', rutas);

  app.use(noEncontrado);
  app.use(manejadorErrores);

  return app;
}

module.exports = { crearApp };
