import { useEffect, useState } from 'react';
import { listarLugares } from './api.js';

export function useDisponibilidad(idSector) {
  const [vista, setVista] = useState({
    lugares: null,
    estado: 'cargando',
    idElegido: null,
    seleccionPerdida: false,
  });

  useEffect(() => {
    let peticion = null;
    let activo = true;

    async function actualizar() {
      if (peticion || document.hidden) return;

      const controlador = new AbortController();
      peticion = controlador;
      const limite = setTimeout(() => controlador.abort(), 5000);

      try {
        const lugares = await listarLugares(idSector, controlador.signal);
        if (!activo) return;

        setVista((anterior) => {
          const perdioLugar = anterior.idElegido !== null && !lugares.some(
            (lugar) => lugar.id === anterior.idElegido && lugar.estado === 'LIBRE',
          );
          return {
            lugares,
            estado: 'actualizado',
            idElegido: perdioLugar ? null : anterior.idElegido,
            seleccionPerdida: perdioLugar || anterior.seleccionPerdida,
          };
        });
      } catch {
        if (activo) setVista((anterior) => ({ ...anterior, estado: 'sin-datos' }));
      } finally {
        clearTimeout(limite);
        peticion = null;
      }
    }

    // Una consulta por segundo mientras el mapa está visible, con una sola petición en curso.
    actualizar();
    const intervalo = setInterval(actualizar, 1000);
    document.addEventListener('visibilitychange', actualizar);
    window.addEventListener('online', actualizar);

    return () => {
      activo = false;
      peticion?.abort();
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', actualizar);
      window.removeEventListener('online', actualizar);
    };
  }, [idSector]);

  function seleccionar(id) {
    setVista((anterior) => {
      if (anterior.idElegido === id) {
        return { ...anterior, idElegido: null, seleccionPerdida: false };
      }
      if (anterior.estado !== 'actualizado' || !anterior.lugares.some(
        (lugar) => lugar.id === id && lugar.estado === 'LIBRE',
      )) return anterior;

      return { ...anterior, idElegido: id, seleccionPerdida: false };
    });
  }

  return { ...vista, seleccionar };
}
