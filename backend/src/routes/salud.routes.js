const { Router } = require('express');
const { estado, estadoBd } = require('../controllers/salud.controller');

const router = Router();

router.get('/', estado);
router.get('/bd', estadoBd);

module.exports = router;
