const baseApi = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

async function consultar(ruta, signal) {
  const respuesta = await fetch(`${baseApi}${ruta}`, { cache: 'no-store', signal });
  if (!respuesta.ok) throw new Error(`La API respondió con HTTP ${respuesta.status}`);

  const { datos } = await respuesta.json();
  return datos;
}

export function listarSectores(signal) {
  return consultar('/sectores', signal);
}

export async function listarLugares(idSector, signal) {
  const { lugares } = await consultar(`/sectores/${idSector}/lugares`, signal);
  return lugares;
}
