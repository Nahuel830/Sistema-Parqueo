const { Router } = require('express');
const { crear, consultar, cancelar } = require('../controllers/reservas.controller');
const { pagar, ficha } = require('../controllers/pagos.controller');

const router = Router();

router.post('/', crear);
router.get('/:id', consultar);
router.post('/:id/cancelar', cancelar);
router.post('/:id/pago', pagar);
router.get('/:id/ficha', ficha);

module.exports = router;
