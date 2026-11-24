const asyncHandler = require('../utils/asyncHandler');
const { iniciarSesion, datosPublicos } = require('../services/auth.service');
const { crearLimiteLogin } = require('../middlewares/limiteLogin');

const limite = crearLimiteLogin();

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const datos = await iniciarSesion(username, password);
    limite.limpiar(req);
    res.json({ ok: true, mensaje: 'Sesión iniciada', datos });
  } catch (error) {
    if (error.status === 401) limite.registrarFallo(req);
    throw error;
  }
});

const yo = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Sesión activa',
    datos: datosPublicos({ id_usuario: req.usuario.id, nombre_completo: req.usuario.nombre, username: req.usuario.username, rol: req.usuario.rol, id_sector: req.usuario.idSector }),
  });
});

module.exports = { login, yo, limiteLogin: limite };
