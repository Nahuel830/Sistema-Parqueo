const { Router } = require('express');
const estadoRutas = require('./estado.routes');
const sectoresRutas = require('./sectores.routes');
const reservasRutas = require('./reservas.routes');
const pagosRutas = require('./pagos.routes');
const authRutas = require('./auth.routes');
const encargadoRutas = require('./encargado.routes');
const adminRutas = require('./admin.routes');

const router = Router();

router.use('/estado', estadoRutas);
router.use('/sectores', sectoresRutas);
router.use('/reservas', reservasRutas);
router.use('/pagos', pagosRutas);
router.use('/auth', authRutas);
router.use('/encargado', encargadoRutas);
router.use('/admin', adminRutas);

module.exports = router;
