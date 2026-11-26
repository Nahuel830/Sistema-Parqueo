import { useCallback, useState } from 'react';
import { consultar, guardar } from './apiAdmin.js';
import { useConsultaAdmin } from './useConsultaAdmin.js';

const ruta = '/admin/sectores';

function Formulario({ registro, esLugar, ocupado, guardarDatos, cerrar }) {
  const creando = !registro?.id;
  function enviar(evento) {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    guardarDatos({ ...Object.fromEntries(campos), activo: campos.get('activo') === 'true' });
  }
  return (
    <form className="formulario-admin formulario-gestion" onSubmit={enviar}>
      <h3>{creando ? 'Crear' : 'Editar'} {esLugar ? 'lugar' : 'sector'}</h3>
      <fieldset disabled={ocupado}>
        {esLugar ? (
          <label>Número<input name="numero" type="number" min="1" max="2147483647" step="1" defaultValue={registro?.numero} required /></label>
        ) : (
          <>
            <label>Nombre<input name="nombre" maxLength="80" defaultValue={registro?.nombre} required /></label>
            <label>Descripción<input name="descripcion" maxLength="200" defaultValue={registro?.descripcion ?? ''} /></label>
            {creando && <label>Tarifa inicial (Bs)<input name="monto" type="number" min="0.01" max="9999.99" step="0.01" required /></label>}
          </>
        )}
        <label>Estado
          <select name="activo" defaultValue={String(registro?.activo ?? true)}>
            <option value="true">Activo</option><option value="false">Desactivado</option>
          </select>
        </label>
      </fieldset>
      <div className="acciones-filtros">
        <button className="accion accion-principal" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar'}</button>
        <button className="accion" type="button" onClick={cerrar} disabled={ocupado}>Cancelar</button>
      </div>
    </form>
  );
}

export default function Catalogo({ token, accesoRechazado }) {
  const [idSector, setIdSector] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const cargarSectores = useCallback((signal) => consultar(ruta, token, signal), [token]);
  const sectores = useConsultaAdmin(cargarSectores, accesoRechazado);
  const sector = sectores.datos?.find((item) => item.id === idSector) ?? sectores.datos?.[0];
  const rutaSector = sector ? `${ruta}/${sector.id}` : null;
  const cargarLugares = useCallback((signal) => (
    rutaSector ? consultar(`${rutaSector}/lugares`, token, signal) : Promise.resolve(null)
  ), [token, rutaSector]);
  const lugares = useConsultaAdmin(cargarLugares, accesoRechazado);

  function abrir(tipo, registro) {
    setAviso(null);
    setFormulario({ tipo, registro });
  }

  async function guardarDatos(datos) {
    if (ocupado) return;
    setOcupado(true);
    setAviso(null);
    const { tipo, registro } = formulario;
    const esLugar = tipo === 'lugar';
    const destino = esLugar ? `${rutaSector}/lugares` : ruta;
    try {
      const actual = await guardar(registro ? `${destino}/${registro.id}` : destino, token, registro ? 'PATCH' : 'POST', datos);
      if (!esLugar) setIdSector(actual.id);
      setAviso({ mensaje: esLugar ? 'Lugar guardado.' : 'Sector guardado.' });
      setFormulario(null);
      sectores.reintentar();
      lugares.reintentar();
    } catch (error) {
      if (error.status === 401 || error.status === 403) accesoRechazado();
      else setAviso({ error: true, mensaje: error.status ? error.message : 'No se pudieron guardar los cambios.' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="panel panel-gestion" aria-labelledby="titulo-catalogo">
      <div className="encabezado-auditoria">
        <h2 id="titulo-catalogo">Sectores y lugares</h2>
        <button className="accion accion-principal" type="button" disabled={ocupado} onClick={() => abrir('sector')}>Crear sector</button>
      </div>
      {aviso && <p role={aviso.error ? 'alert' : 'status'} className={aviso.error ? 'aviso-admin' : ''}>{aviso.mensaje}</p>}
      {formulario && (
        <Formulario key={`${formulario.tipo}-${formulario.registro?.id ?? 'nuevo'}`}
          registro={formulario.registro} esLugar={formulario.tipo === 'lugar'}
          ocupado={ocupado} guardarDatos={guardarDatos} cerrar={() => { setFormulario(null); setAviso(null); }} />
      )}
      {sectores.cargando && <p role="status">Cargando sectores…</p>}
      {sectores.error && (
        <div className="estado-auditoria">
          <p className="aviso-admin" role="alert">No se pudieron cargar los sectores.</p>
          <button className="accion" type="button" onClick={sectores.reintentar}>Reintentar</button>
        </div>
      )}
      {sectores.datos?.length === 0 && <p>Todavía no hay sectores.</p>}
      {sector && (
        <>
          <div className="controles-gestion">
            <div className="formulario-admin">
              <label>Sector
                <select value={sector.id} disabled={ocupado} onChange={(evento) => {
                  setIdSector(Number(evento.currentTarget.value));
                  setFormulario(null);
                  setAviso(null);
                }}>
                  {sectores.datos.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}{item.activo ? '' : ' (desactivado)'}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="accion" type="button" disabled={ocupado} onClick={() => abrir('sector', sector)}>Editar sector</button>
            <button className="accion" type="button" disabled={ocupado} onClick={() => abrir('lugar')}>Crear lugar</button>
          </div>
          <p className="subtitulo">{sector.totalLugares} lugares activos</p>
          {lugares.cargando && <p role="status">Cargando lugares…</p>}
          {lugares.error && (
            <div className="estado-auditoria">
              <p className="aviso-admin" role="alert">No se pudieron cargar los lugares.</p>
              <button className="accion" type="button" onClick={lugares.reintentar}>Reintentar</button>
            </div>
          )}
          {lugares.datos?.lugares.length === 0 && <p>Este sector aún no tiene lugares.</p>}
          <ul className="lista-gestion">
            {lugares.datos?.lugares.map((lugar) => (
              <li key={lugar.id}>
                <div><strong>Lugar {lugar.numero}</strong><span>{lugar.activo ? lugar.estado.toLowerCase() : 'Desactivado'}</span></div>
                <button className="accion" type="button" disabled={ocupado} onClick={() => abrir('lugar', lugar)} aria-label={`Editar lugar ${lugar.numero}`}>Editar</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
