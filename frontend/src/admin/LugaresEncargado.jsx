import { useCallback, useState } from 'react';
import { consultar, guardar } from './apiAdmin.js';
import { useConsultaAdmin } from './useConsultaAdmin.js';

const estados = { LIBRE: 'Libre', RESERVADO: 'Reservado', OCUPADO: 'Ocupado' };

export default function LugaresEncargado({ token, accesoRechazado }) {
  const cargar = useCallback((signal) => consultar('/encargado/lugares', token, signal), [token]);
  const consulta = useConsultaAdmin(cargar, accesoRechazado);
  const [salida, setSalida] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function liberar() {
    if (!salida || enviando) return;
    setEnviando(true);
    setAviso(null);
    try {
      await guardar(`/encargado/lugares/${salida.id}/liberar`, token, 'POST', { idReserva: salida.idReserva });
      setAviso({ mensaje: `Lugar ${salida.numero} liberado.` });
      consulta.reintentar();
    } catch (error) {
      if (error.status === 401 || error.status === 403) accesoRechazado();
      else {
        setAviso({ error: true, mensaje: error.status ? error.message : 'No se pudo registrar la salida.' });
        consulta.reintentar();
      }
    } finally {
      setSalida(null);
      setEnviando(false);
    }
  }

  return (
    <section className="panel auditoria" aria-labelledby="titulo-lugares">
      <div className="encabezado-auditoria">
        <h2 id="titulo-lugares">{consulta.datos?.sector || 'Lugares del sector'}</h2>
        <button className="accion" type="button" onClick={consulta.reintentar} disabled={consulta.cargando || enviando}>Actualizar</button>
      </div>
      {aviso && <p role={aviso.error ? 'alert' : 'status'} className={aviso.error ? 'aviso-admin' : ''}>{aviso.mensaje}</p>}
      {consulta.cargando && <p role="status">Cargando lugares…</p>}
      {consulta.error && <p className="aviso-admin" role="alert">No se pudieron cargar los lugares.</p>}
      {consulta.datos?.lugares.length === 0 && <p>No hay lugares activos asignados.</p>}
      {salida && (
        <div className="salida-encargado">
          <p>Confirma que el vehículo del lugar {salida.numero} ya salió.</p>
          <div className="acciones-filtros">
            <button className="accion accion-principal" type="button" onClick={liberar} disabled={enviando}>Confirmar salida</button>
            <button className="accion" type="button" onClick={() => setSalida(null)} disabled={enviando}>Volver</button>
          </div>
        </div>
      )}
      <ul className="lista-gestion">
        {consulta.datos?.lugares.map((lugar) => (
          <li key={lugar.id}>
            <div><strong>Lugar {lugar.numero}</strong><span>{estados[lugar.estado]}</span></div>
            {lugar.estado === 'OCUPADO' && lugar.idReserva && (
              <button className="accion" type="button" disabled={Boolean(salida)} onClick={() => { setAviso(null); setSalida(lugar); }}>
                Registrar salida
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
