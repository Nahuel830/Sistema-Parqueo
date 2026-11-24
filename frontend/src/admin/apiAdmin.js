import { listarSectores, solicitar } from '../api.js';

function consultar(ruta, token, signal) {
  return solicitar(ruta, { headers: { Authorization: `Bearer ${token}` }, signal });
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
  const parametros = new URLSearchParams(Object.entries(filtros).filter(([, valor]) => valor !== ''));
  const ruta = parametros.size ? `/admin/cancelaciones?${parametros}` : '/admin/cancelaciones';
  return consultar(ruta, token, signal);
}

export async function consultarSectores(token, signal) {
  const [sectores, lugares] = await Promise.all([
    listarSectores(signal),
    consultar('/admin/lugares', token, signal),
  ]);
  const nombres = new Map(sectores.map(({ id, nombre }) => [id, nombre]));
  for (const { idSector, sector } of lugares) nombres.set(idSector, sector);
  return [...nombres].sort((a, b) => a[1].localeCompare(b[1], 'es-BO'));
}

// Contrato propuesto para RF-38. La API actual puede responder 404 hasta publicarlo.
export function consultarBitacora(token, signal) {
  return consultar('/admin/bitacora', token, signal);
}
