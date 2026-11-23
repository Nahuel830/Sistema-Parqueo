const { Router } = require('express');
const { login, yo, limiteLogin } = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');

const router = Router();

router.post('/login', limiteLogin.verificar, login);
router.get('/yo', autenticar, yo);

module.exports = router;
