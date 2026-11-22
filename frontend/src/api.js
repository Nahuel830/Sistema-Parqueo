const baseApi = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

async function solicitar(ruta, opciones, incluirHora = false) {
  const respuesta = await fetch(`${baseApi}${ruta}`, { cache: 'no-store', ...opciones });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const error = new Error(cuerpo?.mensaje ?? `La API respondió con HTTP ${respuesta.status}`);
    error.status = respuesta.status;
    throw error;
  }

  const { datos } = await respuesta.json();
  if (incluirHora) return { datos, horaServidor: Date.parse(respuesta.headers.get('Date')) };
  return datos;
}

export function listarSectores(signal) {
  return solicitar('/sectores', { signal });
}

export async function listarLugares(idSector, signal) {
  const { lugares } = await solicitar(`/sectores/${idSector}/lugares`, { signal });
  return lugares;
}

export function crearReserva(idLugar, signal) {
  return solicitar('/reservas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idLugar }),
    signal,
  }, true);
}

export function consultarReserva(id, tokenReserva, signal) {
  return solicitar(`/reservas/${id}`, { headers: { 'x-reserva-token': tokenReserva }, signal });
}

export function iniciarPago({ id, tokenReserva }, metodo, signal) {
  return solicitar(`/reservas/${id}/pago`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-reserva-token': tokenReserva },
    body: JSON.stringify({ metodo }),
    signal,
  });
}

export function consultarFicha({ id, tokenReserva }, signal) {
  return solicitar(`/reservas/${id}/ficha`, { headers: { 'x-reserva-token': tokenReserva }, signal });
}
