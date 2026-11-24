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

export async function consultarCatalogo(token, signal) {
  try {
    const sectores = await consultar('/admin/sectores', token, signal);
    return { sectores, editable: true };
  } catch (error) {
    if (![404, 501].includes(error.status)) throw error;
  }

  const [publicos, lugares] = await Promise.all([
    listarSectores(signal),
    consultar('/admin/lugares', token, signal),
  ]);
  const sectores = new Map(publicos.map(({ id, nombre, descripcion }) => [id, {
    id, nombre, descripcion, activo: true, lugares: [],
  }]));
  for (const { idSector, sector, id, numero, estado } of lugares) {
    if (!sectores.has(idSector)) {
      sectores.set(idSector, { id: idSector, nombre: sector, descripcion: null, activo: false, lugares: [] });
    }
    sectores.get(idSector).lugares.push({ id, numero, estado, activo: true });
  }
  return { sectores: [...sectores.values()], editable: false };
}

export function consultarTarifas(token, signal) {
  return consultar('/admin/tarifas', token, signal);
}

function enviarGestion(ruta, token, method, datos, signal) {
  return solicitar(ruta, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
    signal,
  });
}

export function guardarSector(token, id, datos, signal) {
  const ruta = id == null ? '/admin/sectores' : `/admin/sectores/${id}`;
  return enviarGestion(ruta, token, id == null ? 'POST' : 'PATCH', datos, signal);
}

export function guardarLugar(token, idSector, idLugar, datos, signal) {
  const base = `/admin/sectores/${idSector}/lugares`;
  const ruta = idLugar == null ? base : `${base}/${idLugar}`;
  return enviarGestion(ruta, token, idLugar == null ? 'POST' : 'PATCH', datos, signal);
}

export function guardarTarifa(token, idSector, monto, signal) {
  return enviarGestion(`/admin/tarifas/${idSector}`, token, 'PUT', { monto }, signal);
}
