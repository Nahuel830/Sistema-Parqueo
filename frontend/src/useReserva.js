import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelarReserva, consultarReserva, crearReserva } from './api.js';

const claveReserva = 'parqueo-tarija:reserva';

function recuperarReserva() {
  try {
    const reserva = JSON.parse(sessionStorage.getItem(claveReserva));
    if (Number.isInteger(reserva?.id) && reserva.tokenReserva && Number.isFinite(Date.parse(reserva.fechaExpiracion))) {
      return reserva;
    }
  } catch {
    // La reserva sigue disponible durante la visita si el navegador bloquea el almacenamiento.
  }
  return null;
}

function guardarReserva(reserva) {
  try {
    if (reserva) sessionStorage.setItem(claveReserva, JSON.stringify(reserva));
    else sessionStorage.removeItem(claveReserva);
  } catch {
    // La reserva se conserva en memoria mientras esta página esté abierta.
  }
}

function tiempoRestante(reserva) {
  if (!reserva) return 0;
  const horaEstimada = Date.now() + (reserva.desfaseReloj ?? 0);
  return Math.max(0, Date.parse(reserva.fechaExpiracion) - horaEstimada);
}

function segundosRestantes(reserva) {
  return Math.ceil(tiempoRestante(reserva) / 1000);
}

const avisosDeCierre = {
  EXPIRADA: 'La reserva venció. Ya puedes elegir otro lugar libre.',
  CANCELADA: 'Reserva cancelada. El lugar quedó libre.',
  PAGADA: 'El pago de tu reserva fue confirmado.',
};

export function useReserva() {
  const [reserva, setReserva] = useState(recuperarReserva);
  const [segundos, setSegundos] = useState(() => segundosRestantes(reserva));
  const [guardando, setGuardando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [cierre, setCierre] = useState(null);
  const [revision, setRevision] = useState(0);
  const [consulta, setConsulta] = useState(0);
  const creando = useRef(false);
  const cancelacionEnCurso = useRef(false);
  const ultimoCierre = useRef(null);
  const consultarEstado = useCallback(() => setConsulta((actual) => actual + 1), []);

  const cerrarReserva = useCallback((id, estado, mensaje) => {
    if (ultimoCierre.current === id) return;
    ultimoCierre.current = id;
    guardarReserva(null);
    setReserva(null);
    setCierre({ id, estado });
    setAviso(mensaje);
    setRevision((actual) => actual + 1);
  }, []);

  useEffect(() => {
    if (!reserva) return;

    let activo = true;
    let peticion = null;
    let consultaProgramada;

    function actualizarReloj() {
      setSegundos(segundosRestantes(reserva));
    }

    async function verificarReserva() {
      actualizarReloj();
      if (peticion) return;
      clearTimeout(consultaProgramada);

      const controlador = new AbortController();
      peticion = controlador;
      const limite = setTimeout(() => controlador.abort(), 5000);
      try {
        const datos = await consultarReserva(reserva.id, reserva.tokenReserva, controlador.signal);
        if (!activo) return;
        if (avisosDeCierre[datos.estado]) {
          cerrarReserva(reserva.id, datos.estado, avisosDeCierre[datos.estado]);
          return;
        }
      } catch (error) {
        if (!activo) return;
        if (error.status === 403 || error.status === 404) {
          cerrarReserva(reserva.id, 'NO_DISPONIBLE', 'La reserva ya no está disponible.');
          return;
        }
      } finally {
        clearTimeout(limite);
        peticion = null;
      }

      // La API confirma el estado incluso si el reloj del dispositivo está adelantado.
      consultaProgramada = setTimeout(verificarReserva, Math.max(1000, tiempoRestante(reserva)));
    }

    function alVolver() {
      if (!document.hidden) verificarReserva();
    }

    verificarReserva();
    const intervalo = setInterval(actualizarReloj, 250);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alVolver);

    return () => {
      activo = false;
      peticion?.abort();
      clearInterval(intervalo);
      clearTimeout(consultaProgramada);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alVolver);
    };
  }, [reserva, consulta, cerrarReserva]);

  async function reservar(lugar, sector) {
    if (creando.current || cancelacionEnCurso.current || reserva) return;
    creando.current = true;
    setGuardando(true);
    setAviso('');
    setCierre(null);

    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 10000);
    try {
      const { datos, horaServidor } = await crearReserva(lugar.id, controlador.signal);
      const inicio = Date.parse(datos.fechaInicio);
      // La cabecera Date pierde los milisegundos. La reserva nunca empieza antes de fechaInicio.
      const horaBase = Number.isFinite(horaServidor) ? Math.max(horaServidor, inicio) : inicio;
      const nueva = {
        ...datos,
        idSector: sector.id,
        nombreSector: sector.nombre,
        numero: lugar.numero,
        desfaseReloj: horaBase - Date.now(),
      };
      guardarReserva(nueva);
      setSegundos(segundosRestantes(nueva));
      setReserva(nueva);
    } catch (error) {
      setAviso(error.status === 409 ? error.message : 'No se pudo confirmar la reserva. Consulta la disponibilidad antes de volver a intentarlo.');
    } finally {
      clearTimeout(limite);
      creando.current = false;
      setGuardando(false);
      setRevision((actual) => actual + 1);
    }
  }

  async function cancelar() {
    if (!reserva || cancelacionEnCurso.current || tiempoRestante(reserva) === 0) return;
    cancelacionEnCurso.current = true;
    setCancelando(true);
    setAviso('');

    try {
      await cancelarReserva(reserva, AbortSignal.timeout(7000));
      cerrarReserva(reserva.id, 'CANCELADA', avisosDeCierre.CANCELADA);
    } catch (error) {
      if (error.status === 410) {
        cerrarReserva(reserva.id, 'EXPIRADA', avisosDeCierre.EXPIRADA);
      } else if (ultimoCierre.current !== reserva.id) {
        setAviso('No se pudo confirmar la cancelación. Puedes volver a intentarlo si la reserva sigue activa.');
        consultarEstado();
      }
    } finally {
      cancelacionEnCurso.current = false;
      setCancelando(false);
    }
  }

  return { reserva, segundos, guardando, cancelando, aviso, cierre, revision, reservar, cancelar, consultarEstado };
}
