const { Router } = require('express');
const { crear, consultar, cancelar } = require('../controllers/reservas.controller');

const router = Router();

router.post('/', crear);
router.get('/:id', consultar);
router.post('/:id/cancelar', cancelar);

module.exports = router;
