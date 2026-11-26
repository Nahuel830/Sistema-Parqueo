import { useEffect, useRef, useState } from 'react';
import { consultarFicha, consultarReserva, iniciarPago } from './api.js';

const clavePagos = 'parqueo-tarija:pagos';
const prefijoFicha = 'parqueo-tarija:ficha:';
const sinPagos = { qr: null, fichas: [] };

function recuperarPagos() {
  let sesion = sinPagos;
  try {
    const datos = JSON.parse(sessionStorage.getItem(clavePagos));
    if (Array.isArray(datos?.fichas)) sesion = datos;
  } catch {
    // La ficha también puede recuperarse desde el almacenamiento del navegador.
  }

  try {
    const fichas = Object.keys(localStorage)
      .filter((clave) => clave.startsWith(prefijoFicha))
      .map((clave) => JSON.parse(localStorage.getItem(clave)))
      .filter((ficha) => ficha?.id && ficha.tokenReserva && ficha.codigo)
      .sort((primera, segunda) => segunda.id - primera.id);
    return { qr: sesion.qr, fichas };
  } catch {
    return sesion;
  }
}

function conservarFicha(credencial, codigo) {
  try {
    const clave = `${prefijoFicha}${credencial.id}`;
    if (codigo) localStorage.setItem(clave, JSON.stringify({ ...credencial, codigo }));
    else localStorage.removeItem(clave);
  } catch {
    // Si el navegador restringe este almacenamiento, se conserva en la sesión.
  }
}

function retirarFicha(anterior, id) {
  return {
    qr: anterior.qr?.id === id ? null : anterior.qr,
    fichas: anterior.fichas.filter((ficha) => ficha.id !== id),
  };
}

function guardarFicha(anterior, credencial, ficha) {
  const vigentes = retirarFicha(anterior, credencial.id);
  return { ...vigentes, fichas: [{ ...credencial, codigo: ficha.codigo }, ...vigentes.fichas] };
}

export function usePago(reserva, cierre, consultarEstado) {
  const [pagos, setPagos] = useState(recuperarPagos);
  const [fichaVisible, setFichaVisible] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const operacionEnCurso = useRef(false);
  const { qr } = pagos;

  useEffect(() => {
    try {
      sessionStorage.setItem(clavePagos, JSON.stringify(pagos));
    } catch {
      // Las fichas se conservan en memoria mientras la página esté abierta.
    }
  }, [pagos]);

  useEffect(() => {
    if (!qr || ocupado) return;
    let activo = true;
    let siguiente;
    const { id, tokenReserva } = qr;
    const credencial = { id, tokenReserva };
    const controlador = new AbortController();

    async function verificarPago() {
      if (document.hidden) {
        siguiente = setTimeout(verificarPago, 2000);
        return;
      }
      const signal = AbortSignal.any([controlador.signal, AbortSignal.timeout(5000)]);
      try {
        const ficha = await consultarFicha(credencial, signal);
        if (!activo) return;
        if (ficha.estado === 'ANULADA') {
          conservarFicha(credencial, null);
          setPagos((anterior) => retirarFicha(anterior, id));
        } else {
          conservarFicha(credencial, ficha.codigo);
          setPagos((anterior) => guardarFicha(anterior, credencial, ficha));
          setFichaVisible({ id, ficha });
          setAviso('');
          if (reserva?.id === id) consultarEstado();
        }
        return;
      } catch (error) {
        if (!activo) return;
        if (error.status === 403 || (error.status === 404 && cierre?.id === id && cierre.estado !== 'PAGADA')) {
          setPagos((anterior) => retirarFicha(anterior, id));
          return;
        }
        if (error.status === 404 && reserva?.id !== id) {
          try {
            const datos = await consultarReserva(id, tokenReserva, signal);
            if (!activo) return;
            if (datos.estado === 'EXPIRADA' || datos.estado === 'CANCELADA') {
              setPagos((anterior) => retirarFicha(anterior, id));
              return;
            }
          } catch (errorConsulta) {
            if (!activo) return;
            if (errorConsulta.status === 404 || errorConsulta.status === 403) {
              setPagos((anterior) => retirarFicha(anterior, id));
              return;
            }
          }
        }
      }
      siguiente = setTimeout(verificarPago, 2000);
    }

    verificarPago();
    return () => {
      activo = false;
      controlador.abort();
      clearTimeout(siguiente);
    };
  }, [qr, ocupado, reserva?.id, cierre, consultarEstado]);

  function mostrarFicha(credencial, ficha) {
    if (ficha.estado === 'ANULADA') {
      conservarFicha(credencial, null);
      setPagos((anterior) => retirarFicha(anterior, credencial.id));
      setFichaVisible((visible) => visible?.id === credencial.id ? null : visible);
      setAviso('Esta ficha ya no está vigente.');
      return;
    }
    conservarFicha(credencial, ficha.codigo);
    setPagos((anterior) => guardarFicha(anterior, credencial, ficha));
    setFichaVisible({ id: credencial.id, ficha });
    setAviso('');
    if (reserva?.id === credencial.id && ficha.estadoPago === 'CONFIRMADO') consultarEstado();
  }

  useEffect(() => {
    if (!cierre || !['EXPIRADA', 'CANCELADA', 'NO_DISPONIBLE'].includes(cierre.estado)) return;
    // Al cerrarse la reserva se deja de mostrar una ficha que ya puede haber sido anulada.
    setFichaVisible((visible) => visible?.id === cierre.id ? null : visible);
    if (cierre.estado === 'CANCELADA') {
      conservarFicha({ id: cierre.id }, null);
      setPagos((anterior) => retirarFicha(anterior, cierre.id));
    }
  }, [cierre]);

  useEffect(() => {
    if (reserva) setFichaVisible((visible) => visible?.id === reserva.id ? visible : null);
  }, [reserva]);

  async function operar(tarea) {
    if (operacionEnCurso.current) return;
    operacionEnCurso.current = true;
    setOcupado(true);
    setAviso('');
    try {
      await tarea();
    } finally {
      operacionEnCurso.current = false;
      setOcupado(false);
    }
  }

  function pagar(metodo) {
    if (!reserva) return;
    const credencial = { id: reserva.id, tokenReserva: reserva.tokenReserva };
    return operar(async () => {
      try {
        const datos = await iniciarPago(credencial, metodo, AbortSignal.timeout(7000));
        if (datos.ficha) mostrarFicha(credencial, datos.ficha);
        else setPagos((anterior) => ({
          ...anterior, qr: { ...credencial, codigoQr: datos.codigoQr, imagenQr: datos.imagenQr, simulado: datos.simulado },
        }));
      } catch (error) {
        if (error.status === 409 || !error.status) {
          try {
            const ficha = await consultarFicha(credencial, AbortSignal.timeout(5000));
            mostrarFicha(credencial, ficha);
            return;
          } catch {
            // Si todavía no hay ficha, se informa el resultado de la solicitud de pago.
          }
        }
        const mensaje = [409, 503].includes(error.status) ? error.message : 'No se pudo iniciar el pago. Vuelve a intentarlo.';
        setAviso(error.status === 410 ? 'La reserva venció.' : mensaje);
      }
    });
  }

  function volverAVer({ id, tokenReserva }) {
    const credencial = { id, tokenReserva };
    return operar(async () => {
      try {
        mostrarFicha(credencial, await consultarFicha(credencial, AbortSignal.timeout(5000)));
      } catch (error) {
        if ([403, 404, 410].includes(error.status)) {
          conservarFicha(credencial, null);
          setPagos((anterior) => retirarFicha(anterior, id));
          setAviso('Esta ficha ya no está disponible.');
        } else {
          setAviso('No se pudo consultar la ficha. Vuelve a intentarlo.');
        }
      }
    });
  }

  return {
    qr: qr && qr.id === reserva?.id ? qr : null,
    fichas: pagos.fichas,
    fichaVisible,
    ocultarFicha: () => setFichaVisible(null),
    aviso,
    ocupado,
    pagar,
    volverAVer,
  };
}
