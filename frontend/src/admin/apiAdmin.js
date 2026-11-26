import { descargar, solicitar } from '../api.js';

export function consultar(ruta, token, signal) {
  return solicitar(ruta, { headers: { Authorization: `Bearer ${token}` }, signal });
}

export function guardar(ruta, token, method, datos) {
  return solicitar(ruta, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
    signal: AbortSignal.timeout(12000),
  });
}

function conFiltros(ruta, filtros) {
  const parametros = new URLSearchParams(Object.entries(filtros).filter(([, valor]) => valor !== ''));
  return parametros.size ? `${ruta}?${parametros}` : ruta;
}

export function iniciarSesion(credenciales, signal) {
  return solicitar('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credenciales),
    signal,
  });
}

export function consultarSesion(token, signal) {
  return consultar('/auth/yo', token, signal);
}

export function consultarCancelaciones(token, filtros, signal) {
  return consultar(conFiltros('/admin/cancelaciones', filtros), token, signal);
}

export async function consultarSectores(token, signal) {
  const sectores = await consultar('/admin/sectores', token, signal);
  return sectores.map(({ id, nombre }) => [id, nombre]);
}

export function consultarBitacora(token, signal) {
  return consultar('/admin/bitacora', token, signal);
}

export function consultarReporte(token, filtros, signal) {
  return consultar(conFiltros('/admin/reportes/resumen', filtros), token, signal);
}

export function descargarReporte(token, filtros, formato) {
  return descargar(conFiltros(`/admin/reportes/resumen/${formato}`, filtros), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  }, `reporte-parqueo.${formato}`);
}
