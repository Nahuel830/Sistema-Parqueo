const { Router } = require('express');
const c = require('../controllers/encargado.controller');
const { autenticar, exigirRol } = require('../middlewares/auth');

const router = Router();

// Todo el panel del encargado exige sesión y rol ENCARGADO; cada consulta se limita a su sector.
router.use(autenticar, exigirRol('ENCARGADO'));

router.get('/lugares', c.lugares);
router.post('/lugares/:id/liberar', c.liberar);
router.get('/fichas', c.fichas);
router.get('/fichas/:codigo', c.ficha);
router.post('/fichas/:codigo/cobrar', c.cobrar);
router.post('/fichas/:codigo/verificar', c.verificar);
router.post('/fichas/:codigo/pagada', c.pagada);
router.get('/notificaciones', c.notificaciones);
router.post('/notificaciones/:id/leida', c.leida);

module.exports = router;
