const { Router } = require('express');
const { listar, listarLugares } = require('../controllers/sectores.controller');

const router = Router();

router.get('/', listar);
router.get('/:id/lugares', listarLugares);

module.exports = router;
