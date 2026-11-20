const { Router } = require('express');
const estadoRutas = require('./estado.routes');
const sectoresRutas = require('./sectores.routes');
const reservasRutas = require('./reservas.routes');

const router = Router();

router.use('/estado', estadoRutas);
router.use('/sectores', sectoresRutas);
router.use('/reservas', reservasRutas);

module.exports = router;
