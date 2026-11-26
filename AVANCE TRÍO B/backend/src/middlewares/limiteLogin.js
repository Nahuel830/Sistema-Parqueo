// Limita los intentos fallidos de inicio de sesión por IP y usuario (en memoria).
function crearLimiteLogin({ maximo = 5, ventanaMs = 15 * 60 * 1000, ahora = () => Date.now(), limiteEntradas = 5000 } = {}) {
  const intentos = new Map();

  function clave(req) {
    const usuario = String((req.body && req.body.username) || '').trim().toLowerCase().slice(0, 40);
    return `${req.ip}|${usuario}`;
  }

  function vigente(registro) {
    return registro && ahora() - registro.inicio < ventanaMs;
  }

  function verificar(req, res, next) {
    const registro = intentos.get(clave(req));
    if (vigente(registro) && registro.fallos >= maximo) {
      const espera = Math.ceil((ventanaMs - (ahora() - registro.inicio)) / 60000);
      return res.status(429).json({ ok: false, mensaje: `Demasiados intentos. Vuelve a intentar en ${espera} minuto(s)` });
    }
    return next();
  }

  // Evita que el mapa crezca sin límite si alguien prueba miles de usuarios distintos.
  function purgar() {
    for (const [k, registro] of intentos) {
      if (!vigente(registro)) intentos.delete(k);
    }
  }

  function registrarFallo(req) {
    if (intentos.size >= limiteEntradas) purgar();
    const k = clave(req);
    const registro = intentos.get(k);
    if (vigente(registro)) registro.fallos += 1;
    else intentos.set(k, { fallos: 1, inicio: ahora() });
  }

  function limpiar(req) {
    intentos.delete(clave(req));
  }

  return { verificar, registrarFallo, limpiar, tamano: () => intentos.size };
}

module.exports = { crearLimiteLogin };
