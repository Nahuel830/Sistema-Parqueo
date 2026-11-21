const { Router } = require('express');
const estadoRutas = require('./estado.routes');
const sectoresRutas = require('./sectores.routes');
const reservasRutas = require('./reservas.routes');
const pagosRutas = require('./pagos.routes');

const router = Router();

router.use('/estado', estadoRutas);
router.use('/sectores', sectoresRutas);
router.use('/reservas', reservasRutas);
router.use('/pagos', pagosRutas);

module.exports = router;
