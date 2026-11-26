import { useEffect, useState } from 'react';

// Consulta una vez al montar y luego cada `intervaloMs`. Mantiene los datos anteriores
// mientras actualiza, para que la pantalla no parpadee. Si cambia `consultar`
// (por ejemplo, un filtro), descarta los datos de la consulta anterior.
export function useSondeo(consultar, accesoRechazado, intervaloMs = 5000) {
  const [estado, setEstado] = useState({ origen: null, datos: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    const controlador = new AbortController();

    async function leer() {
      try {
        const datos = await consultar(AbortSignal.any([controlador.signal, AbortSignal.timeout(8000)]));
        if (vivo) setEstado({ origen: consultar, datos, error: null });
      } catch (error) {
        if (!vivo) return;
        if (error.status === 401 || error.status === 403) accesoRechazado();
        else setEstado((previo) => ({ origen: consultar, datos: previo.origen === consultar ? previo.datos : null, error }));
      }
    }

    leer();
    const temporizador = setInterval(leer, intervaloMs);
    return () => {
      vivo = false;
      controlador.abort();
      clearInterval(temporizador);
    };
  }, [consultar, accesoRechazado, intervaloMs, version]);

  const actual = estado.origen === consultar ? estado : null;
  return {
    datos: actual?.datos ?? null,
    error: actual?.error ?? null,
    cargando: actual === null,
    actualizar: () => setVersion((valor) => valor + 1),
  };
}
