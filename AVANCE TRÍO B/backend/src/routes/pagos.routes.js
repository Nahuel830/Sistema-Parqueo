const { Router } = require('express');
const { confirmarQr } = require('../controllers/pagos.controller');

const router = Router();

// Confirmación del banco/pasarela (requiere el header x-pasarela-secret).
router.post('/qr/confirmar', confirmarQr);

module.exports = router;
