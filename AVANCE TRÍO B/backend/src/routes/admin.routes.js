const { Router } = require('express');
const c = require('../controllers/admin.controller');
const { autenticar, exigirRol } = require('../middlewares/auth');

const router = Router();

// Todo el panel del administrador exige sesión y rol ADMIN.
router.use(autenticar, exigirRol('ADMIN'));

router.get('/lugares', c.lugares);
router.get('/cancelaciones', c.cancelaciones);
router.get('/pagos', c.pagos);
router.get('/reportes/resumen', c.resumen);
router.get('/bitacora', c.bitacora);
router.get('/tarifas', c.tarifas);
router.put('/tarifas/:idSector', c.cambiarTarifa);
router.get('/encargados', c.encargados);
router.post('/encargados', c.crearEncargado);
router.patch('/encargados/:id', c.editarEncargado);
router.post('/encargados/:id/password', c.contrasena);

module.exports = router;
