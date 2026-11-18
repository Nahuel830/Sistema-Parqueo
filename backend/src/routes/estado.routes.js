const { Router } = require('express');
const { obtenerEstado, obtenerEstadoBd } = require('../controllers/estado.controller');

const router = Router();

router.get('/', obtenerEstado);
router.get('/bd', obtenerEstadoBd);

module.exports = router;
