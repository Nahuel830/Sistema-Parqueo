import { useCallback, useMemo, useState } from 'react';
import { consultarNotificaciones } from './apiAdmin.js';
import FichasEncargado from './FichasEncargado.jsx';
import LugaresEncargado from './LugaresEncargado.jsx';
import { useSondeo } from './useSondeo.js';

// Pantalla del encargado: recibe las fichas de su sector (con aviso de las nuevas),
// las valida (cobro en efectivo, verificación y pago) y registra la salida de los vehículos.
export default function PanelEncargado({ token, accesoRechazado }) {
  const [seccion, setSeccion] = useState('fichas');
  const cargarNuevas = useCallback((signal) => consultarNotificaciones(token, true, signal), [token]);
  const notificaciones = useSondeo(cargarNuevas, accesoRechazado, 5000);

  const lista = notificaciones.datos ?? [];
  const nuevas = useMemo(() => lista.map((n) => n.codigoFicha), [lista]);
  const idDe = useCallback((codigo) => lista.find((n) => n.codigoFicha === codigo)?.id, [lista]);

  return (
    <div className="auditoria">
      <nav className="nav-auditoria" aria-label="Secciones del encargado">
        <button className="accion" type="button" aria-pressed={seccion === 'fichas'} onClick={() => setSeccion('fichas')}>
          Fichas
          {nuevas.length > 0 && <span className="insignia-nuevas" aria-label={`${nuevas.length} fichas nuevas`}>{nuevas.length}</span>}
        </button>
        <button className="accion" type="button" aria-pressed={seccion === 'lugares'} onClick={() => setSeccion('lugares')}>Lugares y salidas</button>
      </nav>
      {nuevas.length > 0 && seccion !== 'fichas' && <p role="status" className="aviso-nuevas">Tienes {nuevas.length} ficha(s) nueva(s) por revisar.</p>}
      {seccion === 'fichas'
        ? <FichasEncargado token={token} accesoRechazado={accesoRechazado} nuevas={nuevas} idDe={idDe} alCambiar={notificaciones.actualizar} />
        : <LugaresEncargado token={token} accesoRechazado={accesoRechazado} />}
    </div>
  );
}
