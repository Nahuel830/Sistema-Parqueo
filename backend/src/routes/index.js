const { Router } = require('express');
const saludRutas = require('./salud.routes');

const router = Router();

router.use('/salud', saludRutas);

module.exports = router;
