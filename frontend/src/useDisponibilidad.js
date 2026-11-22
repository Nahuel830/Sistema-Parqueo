import { useEffect, useState } from 'react';
import { listarLugares } from './api.js';

export function useDisponibilidad(idSector, revision) {
  const [vista, setVista] = useState({
    lugares: null,
    estado: 'cargando',
    revision,
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

        setVista({ lugares, estado: 'actualizado', revision });
      } catch {
        if (activo) setVista((anterior) => ({ ...anterior, estado: 'sin-datos', revision }));
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
  }, [idSector, revision]);

  return { lugares: vista.lugares, estado: vista.revision === revision ? vista.estado : 'cargando' };
}
