const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { buscarUsuarioActivo } = require('../services/auth.service');

function extraerToken(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  return m ? m[1] : null;
}

// Valida el JWT y comprueba en la BD que el usuario siga activo.
// `buscar` se puede reemplazar en las pruebas.
function crearAutenticar(buscar = buscarUsuarioActivo) {
  return async function autenticar(req, res, next) {
    const token = extraerToken(req);
    if (!token) return res.status(401).json({ ok: false, mensaje: 'Debes iniciar sesión' });
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secreto, { algorithms: ['HS256'] });
    } catch (_) {
      return res.status(401).json({ ok: false, mensaje: 'Sesión inválida o expirada' });
    }
    try {
      const u = await buscar(Number(payload.sub));
      if (!u) return res.status(401).json({ ok: false, mensaje: 'Sesión inválida o expirada' });
      req.usuario = { id: u.id_usuario, rol: u.rol, idSector: u.id_sector, username: u.username, nombre: u.nombre_completo };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function exigirRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ ok: false, mensaje: 'No tienes permiso para esta acción' });
    }
    return next();
  };
}

module.exports = { autenticar: crearAutenticar(), crearAutenticar, exigirRol };
