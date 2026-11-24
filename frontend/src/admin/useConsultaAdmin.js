import { useEffect, useState } from 'react';

export function useConsultaAdmin(consultar, accesoRechazado) {
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(null);

  useEffect(() => {
    const controlador = new AbortController();
    const signal = AbortSignal.any([controlador.signal, AbortSignal.timeout(8000)]);

    consultar(signal)
      .then((datos) => {
        if (!controlador.signal.aborted) setRespuesta({ consultar, intento, datos });
      })
      .catch((error) => {
        if (controlador.signal.aborted) return;
        if (error.status === 401 || error.status === 403) accesoRechazado();
        else setRespuesta({ consultar, intento, error });
      });

    return () => controlador.abort();
  }, [consultar, intento, accesoRechazado]);

  const actual = respuesta?.consultar === consultar && respuesta.intento === intento ? respuesta : null;
  return {
    datos: actual?.datos,
    error: actual?.error,
    cargando: actual === null,
    reintentar: () => setIntento((valor) => valor + 1),
  };
}
