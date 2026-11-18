const { Router } = require('express');
const estadoRutas = require('./estado.routes');

const router = Router();

router.use('/estado', estadoRutas);

module.exports = router;
