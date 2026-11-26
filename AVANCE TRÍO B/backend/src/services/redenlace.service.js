const { config } = require('../config/env');
const { errorHttp } = require('../utils/http');

const { redEnlace, secreto } = config.pasarela;
const REFERENCIA = /^\d{1,40}$/;
let token = null;
let autenticando = null;

function pasarelaNoDisponible() {
  const error = errorHttp(503, 'No se pudo comprobar el estado del QR con Red Enlace. Intenta de nuevo.');
  error.code = 'PASARELA_NO_DISPONIBLE';
  return error;
}

async function solicitar(ruta, opciones) {
  if (config.pasarela.proveedor !== 'redenlace') throw pasarelaNoDisponible();
  try {
    const respuesta = await fetch(`${redEnlace.base.replace(/\/+$/, '')}/${ruta}`, {
      ...opciones, redirect: 'error', signal: AbortSignal.timeout(2500),
    });
    if (respuesta.status === 401 || respuesta.status === 403) token = null;
    const cuerpo = await respuesta.json();
    return { ok: respuesta.ok, cuerpo };
  } catch {
    throw pasarelaNoDisponible();
  }
}

function obtenerToken() {
  if (token && token.vence > Date.now()) return Promise.resolve(token.valor);
  if (!autenticando) {
    autenticando = solicitar('oauth-client-credentials/access-token?grant_type=client_credentials', {
      method: 'POST',
      headers: { Authorization: `Basic ${redEnlace.basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then(({ ok, cuerpo }) => {
      if (!ok || typeof cuerpo?.access_token !== 'string' || !cuerpo.access_token) throw pasarelaNoDisponible();
      token = { valor: cuerpo.access_token, vence: Date.now() + Math.max(0, Number(cuerpo.expires_in) - 30) * 1000 };
      return token.valor;
    }).finally(() => { autenticando = null; });
  }
  return autenticando;
}

async function operacion(ruta, method, datos) {
  const access_token = await obtenerToken();
  return solicitar(`qr/simple/v2/${ruta}`, {
    method,
    headers: { access_token, client_id: redEnlace.cliente, 'Content-Type': 'application/json' },
    body: datos && JSON.stringify(datos),
  });
}

function fechaBolivia(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(valor)) {
    throw pasarelaNoDisponible();
  }
  const fecha = new Date(/(Z|[+-]\d{2}:\d{2})$/.test(valor) ? valor : `${valor}-04:00`);
  if (!Number.isFinite(fecha.getTime())) throw pasarelaNoDisponible();
  return fecha;
}

function coincide(datos, idReserva, importe, monto) {
  return datos?.moneda === 'BOB' && String(datos.numeroReferenciaOriginante) === String(idReserva)
    && ['string', 'number'].includes(typeof importe) && /^\d+(\.\d{1,2})?$/.test(String(importe))
    && Number(importe) === Number(monto);
}

async function generarQr(reserva) {
  await obtenerToken();
  // Margen para la latencia de generación y las diferencias entre relojes.
  const vigencia = Math.floor((reserva.fecha_expiracion.getTime() - Date.now()) / 1000) - 5;
  if (vigencia < 10) throw errorHttp(409, 'Queda muy poco tiempo para generar un QR. Puedes pagar en efectivo.');
  const { ok, cuerpo } = await operacion('generate', 'POST', {
    glosa: `Parqueo Tarija - Reserva ${reserva.id_reserva}`,
    moneda: 'BOB',
    monto: Number(reserva.monto),
    numeroReferencia: String(reserva.id_reserva),
    vigencia,
    idEstablecimiento: redEnlace.establecimiento,
    nombreEstablecimiento: redEnlace.nombre,
    webhook: { url: redEnlace.webhook, key: 'x-pasarela-secret', value: secreto },
  });
  const datos = cuerpo?.data;
  if (!ok || cuerpo?.success !== true || datos?.estado !== 'PENDIENTE'
      || !coincide(datos, reserva.id_reserva, datos.monto, reserva.monto)
      || !REFERENCIA.test(String(datos.numeroReferencia))
      || typeof datos.qr !== 'string' || !/^iVBORw0KGgo[A-Za-z0-9+/=\r\n]+$/.test(datos.qr)
      || datos.qr.length > 250000) throw pasarelaNoDisponible();
  return { referencia: String(datos.numeroReferencia), codigoQr: datos.qr.replace(/\s/g, '') };
}

async function consultarQr(pago) {
  const { ok, cuerpo } = await operacion(`verify/${pago.referencia_pasarela}`, 'GET');
  const datos = cuerpo?.data;
  if (!ok || cuerpo?.success !== true || !coincide(datos, pago.id_reserva, datos?.importe, pago.monto)
      || String(datos.numeroReferencia) !== pago.referencia_pasarela
      || !['PAGADO', 'PENDIENTE', 'EXPIRADO', 'CANCELADO'].includes(datos.estado)) throw pasarelaNoDisponible();
  return {
    estado: datos.estado,
    fechaPago: datos.estado === 'PAGADO' ? fechaBolivia(datos.bancoOrigen?.fechaTransaccion) : null,
  };
}

async function cerrarQr(pago) {
  const estado = await consultarQr(pago);
  if (estado.estado !== 'PENDIENTE') return estado;
  const { ok, cuerpo } = await operacion(`cancel/${pago.referencia_pasarela}`, 'POST');
  if (ok && cuerpo?.success === true && cuerpo.data?.estado === 'CANCELADO'
      && String(cuerpo.data.numeroReferencia) === pago.referencia_pasarela) return { estado: 'CANCELADO' };
  // Otro proceso pudo pagar o cancelar entre la consulta y la solicitud de cancelación.
  const ultimo = await consultarQr(pago);
  if (ultimo.estado === 'PENDIENTE') throw pasarelaNoDisponible();
  return ultimo;
}

module.exports = { generarQr, consultarQr, cerrarQr, REFERENCIA };
