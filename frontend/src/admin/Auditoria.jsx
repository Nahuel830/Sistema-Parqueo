import { useCallback, useState } from 'react';
import { consultarBitacora, consultarCancelaciones, consultarSectores } from './apiAdmin.js';
import { useConsultaAdmin } from './useConsultaAdmin.js';
import GestionParqueo from './GestionParqueo.jsx';

const filtrosVacios = { desde: '', hasta: '', idSector: '', tipo: '' };
const tipos = { CONDUCTOR: 'Conductor', EXPIRACION: 'Expiración' };
const fechaHoraBolivia = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz', dateStyle: 'medium', timeStyle: 'medium', hourCycle: 'h23',
});

function FechaHora({ fecha }) {
  return <time dateTime={fecha}>{fechaHoraBolivia.format(new Date(fecha))}</time>;
}

function duracion(segundos) {
  const minutos = Math.floor(segundos / 60);
  return minutos ? `${minutos} min ${segundos % 60} s` : `${segundos} s`;
}

const columnasCancelaciones = [
  ['Fecha y hora', (fila) => <FechaHora fecha={fila.fecha} />],
  ['Sector', (fila) => fila.sector],
  ['Lugar', (fila) => String(fila.numeroLugar).padStart(2, '0')],
  ['Tipo', (fila) => <span className="tipo-auditoria" data-tipo={fila.tipo}>{tipos[fila.tipo] || fila.tipo}</span>],
  ['Motivo', (fila) => fila.motivo || 'Sin motivo registrado'],
  ['Tiempo transcurrido', (fila) => duracion(fila.segundosTranscurridos)],
];

const columnasBitacora = [
  ['Fecha y hora', (fila) => <FechaHora fecha={fila.fecha} />],
  ['Acción', (fila) => fila.accion],
  ['Entidad', (fila) => `${fila.entidad} #${fila.idEntidad}`],
  ['Estado anterior', (fila) => fila.estadoAnterior ?? '—'],
  ['Estado nuevo', (fila) => fila.estadoNuevo ?? '—'],
  ['Responsable', (fila) => fila.responsable || 'Sin responsable registrado'],
];

function TablaAuditoria({ etiqueta, columnas, filas }) {
  return (
    <div className="tabla-auditoria" tabIndex={0} role="region" aria-label={etiqueta}>
      <table role="table">
        <thead role="rowgroup">
          <tr role="row">
            {columnas.map(([titulo]) => <th key={titulo} scope="col" role="columnheader">{titulo}</th>)}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {filas.map((fila) => (
            <tr key={fila.id} role="row">
              {columnas.map(([titulo, renderizar]) => (
                <td key={titulo} role="cell" data-columna={titulo}>
                  <span className="etiqueta-celda" aria-hidden="true">{titulo}</span>
                  <div>{renderizar(fila)}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EstadoConsulta({ consulta, nombre, textoVacio }) {
  if (consulta.cargando) return <p className="estado-auditoria" role="status">Cargando {nombre}…</p>;
  if (consulta.error) {
    return (
      <div className="estado-auditoria">
        <p className="aviso-admin" role="alert">No se pudo consultar {nombre}.</p>
        <button className="accion" type="button" onClick={consulta.reintentar}>Reintentar</button>
      </div>
    );
  }
  if (consulta.datos?.length === 0) return <p className="estado-auditoria" role="status">{textoVacio}</p>;
  return null;
}

function Cancelaciones({ token, accesoRechazado }) {
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [aplicados, setAplicados] = useState(filtrosVacios);
  const cargarCancelaciones = useCallback(
    (signal) => consultarCancelaciones(token, aplicados, signal), [token, aplicados],
  );
  const cargarSectores = useCallback((signal) => consultarSectores(token, signal), [token]);
  const consulta = useConsultaAdmin(cargarCancelaciones, accesoRechazado);
  const sectores = useConsultaAdmin(cargarSectores, accesoRechazado);

  function cambiarFiltro({ target }) {
    setFiltros((anterior) => ({ ...anterior, [target.name]: target.value }));
  }

  function aplicar(evento) {
    evento.preventDefault();
    setAplicados({ ...filtros });
  }

  function limpiar() {
    setFiltros(filtrosVacios);
    setAplicados({ ...filtrosVacios });
  }

  return (
    <section className="panel panel-auditoria" aria-labelledby="titulo-tabla">
      <header className="encabezado-auditoria">
        <h2 id="titulo-tabla">Cancelaciones</h2>
        <p>Hora de Bolivia</p>
      </header>

      <form className="formulario-admin filtros-auditoria" onSubmit={aplicar} aria-label="Filtros de cancelaciones">
        <label>Desde<input name="desde" type="date" value={filtros.desde} onChange={cambiarFiltro} /></label>
        <label>Hasta<input name="hasta" type="date" min={filtros.desde || undefined} value={filtros.hasta} onChange={cambiarFiltro} /></label>
        <label><span id="etiqueta-filtro-sector">Sector</span>
          <select aria-labelledby="etiqueta-filtro-sector" name="idSector" value={filtros.idSector} onChange={cambiarFiltro} disabled={!sectores.datos?.length}>
            <option value="">Todos</option>
            {sectores.datos?.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </label>
        <label><span id="etiqueta-filtro-tipo">Tipo</span>
          <select aria-labelledby="etiqueta-filtro-tipo" name="tipo" value={filtros.tipo} onChange={cambiarFiltro}>
            <option value="">Todos</option>
            {Object.entries(tipos).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </label>
        <div className="acciones-filtros">
          <button className="accion accion-principal" type="submit">Aplicar filtros</button>
          <button className="accion" type="button" onClick={limpiar}>Limpiar</button>
        </div>
      </form>
      {sectores.error && (
        <div className="estado-auditoria">
          <p className="aviso-admin" role="alert">No se pudieron cargar los sectores para el filtro.</p>
          <button className="accion" type="button" onClick={sectores.reintentar}>Recargar sectores</button>
        </div>
      )}

      <EstadoConsulta consulta={consulta} nombre="cancelaciones" textoVacio="No hay cancelaciones con estos filtros." />
      {consulta.datos?.length > 0 && (
        <>
          <TablaAuditoria etiqueta="Tabla de cancelaciones" columnas={columnasCancelaciones} filas={consulta.datos} />
          <p className="pie-auditoria" role="status">
            {consulta.datos.length === 500
              ? 'Se muestran los 500 registros más recientes. Acota las fechas para consultar otros registros.'
              : `${consulta.datos.length} ${consulta.datos.length === 1 ? 'registro' : 'registros'}`}
          </p>
        </>
      )}
    </section>
  );
}

function Bitacora({ token, accesoRechazado }) {
  const cargar = useCallback((signal) => consultarBitacora(token, signal), [token]);
  const consulta = useConsultaAdmin(cargar, accesoRechazado);
  const pendiente = consulta.error?.status === 404 || consulta.error?.status === 501;

  return (
    <section className="panel panel-auditoria" aria-labelledby="titulo-tabla">
      <header className="encabezado-auditoria">
        <h2 id="titulo-tabla">Bitácora de acciones</h2>
        <p>Hora de Bolivia</p>
      </header>
      {pendiente ? (
        <p className="estado-auditoria" role="status">La consulta de la bitácora todavía no está disponible.</p>
      ) : (
        <EstadoConsulta consulta={consulta} nombre="la bitácora" textoVacio="No hay acciones registradas." />
      )}
      {consulta.datos?.length > 0 && (
        <TablaAuditoria etiqueta="Tabla de acciones" columnas={columnasBitacora} filas={consulta.datos} />
      )}
    </section>
  );
}

export default function Auditoria({ token, accesoRechazado }) {
  const [seccion, setSeccion] = useState('cancelaciones');

  return (
    <div className="auditoria">
      <nav className="nav-auditoria" aria-label="Secciones de administración">
        <button className="accion" type="button" aria-pressed={seccion === 'cancelaciones'} onClick={() => setSeccion('cancelaciones')}>Cancelaciones</button>
        <button className="accion" type="button" aria-pressed={seccion === 'bitacora'} onClick={() => setSeccion('bitacora')}>Bitácora</button>
        <button className="accion" type="button" aria-pressed={seccion === 'gestion'} onClick={() => setSeccion('gestion')}>Sectores y tarifas</button>
      </nav>
      {seccion === 'cancelaciones' && <Cancelaciones token={token} accesoRechazado={accesoRechazado} />}
      {seccion === 'bitacora' && <Bitacora token={token} accesoRechazado={accesoRechazado} />}
      {seccion === 'gestion' && <GestionParqueo token={token} accesoRechazado={accesoRechazado} />}
    </div>
  );
}
