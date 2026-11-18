const { Router } = require('express');
const estadoRutas = require('./estado.routes');
const sectoresRutas = require('./sectores.routes');

const router = Router();

router.use('/estado', estadoRutas);
router.use('/sectores', sectoresRutas);

module.exports = router;
