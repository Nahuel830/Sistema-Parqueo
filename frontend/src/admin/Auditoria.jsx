import { useCallback, useState } from 'react';
import Catalogo from './Catalogo.jsx';
import { 
  consultarBitacora, 
  consultarCancelaciones, 
  consultarReporte, 
  consultarSectores, 
  descargarReporte 
} from './apiAdmin.js';
import { useConsultaAdmin } from './useConsultaAdmin.js';

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

  return (
    <section className="panel panel-auditoria" aria-labelledby="titulo-tabla">
      <header className="encabezado-auditoria">
        <h2 id="titulo-tabla">Bitácora de acciones</h2>
        <p>Hora de Bolivia</p>
      </header>
      <EstadoConsulta consulta={consulta} nombre="la bitácora" textoVacio="No hay acciones registradas." />
      {consulta.datos?.length > 0 && (
        <TablaAuditoria etiqueta="Tabla de acciones" columnas={columnasBitacora} filas={consulta.datos} />
      )}
    </section>
  );
}

const moneda = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoBolivianos = (monto) => `Bs ${moneda.format(Number(monto))}`;
const columnasReporte = [
  ['Ingresos por sector y método', 'ingresosPorSectorYMetodo', [
    ['Sector', (fila) => fila.sector], ['Método', (fila) => fila.metodo],
    ['Cobros', (fila) => fila.cantidad], ['Total', (fila) => formatoBolivianos(fila.total)],
  ]],
  ['Ocupación actual', 'ocupacionActual', [
    ['Sector', (fila) => fila.sector], ['Estado', (fila) => fila.estado], ['Lugares', (fila) => fila.cantidad],
  ]],
  ['Cancelaciones por tipo', 'cancelacionesPorTipo', [
    ['Tipo', (fila) => tipos[fila.tipo]], ['Cantidad', (fila) => fila.cantidad],
  ]],
];

function Reportes({ token, accesoRechazado }) {
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', idSector: '' });
  const [descargando, setDescargando] = useState(null);
  const [aviso, setAviso] = useState('');
  const cargarReporte = useCallback((signal) => consultarReporte(token, filtros, signal), [token, filtros]);
  const cargarSectores = useCallback((signal) => consultarSectores(token, signal), [token]);
  const reporte = useConsultaAdmin(cargarReporte, accesoRechazado);
  const sectores = useConsultaAdmin(cargarSectores, accesoRechazado);

  function aplicar(evento) {
    evento.preventDefault();
    setAviso('');
    setFiltros(Object.fromEntries(new FormData(evento.currentTarget)));
  }

  async function exportar(formato) {
    if (descargando) return;
    setDescargando(formato);
    setAviso('');
    try {
      await descargarReporte(token, filtros, formato);
    } catch (error) {
      if (error.status === 401 || error.status === 403) accesoRechazado();
      else setAviso(error.status ? error.message : 'No se pudo descargar el reporte.');
    } finally {
      setDescargando(null);
    }
  }

  return (
    <section className="panel panel-gestion" aria-labelledby="titulo-reportes">
      <div className="encabezado-auditoria"><h2 id="titulo-reportes">Reportes</h2><p>Hora de Bolivia</p></div>
      <p className="subtitulo">Las fechas filtran los ingresos y las cancelaciones. La ocupación corresponde al momento de la consulta.</p>
      <form className="formulario-admin filtros-auditoria" onSubmit={aplicar}>
        <label>Desde<input name="desde" type="date" /></label>
        <label>Hasta<input name="hasta" type="date" /></label>
        <label>Sector
          <select name="idSector">
            <option value="">Todos</option>
            {sectores.datos?.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </label>
        <div className="acciones-filtros">
          <button className="accion accion-principal" disabled={Boolean(descargando)}>Aplicar filtros</button>
          <button className="accion" type="button" disabled={!reporte.datos || Boolean(descargando)} onClick={() => exportar('pdf')}>Descargar PDF</button>
          <button className="accion" type="button" disabled={!reporte.datos || Boolean(descargando)} onClick={() => exportar('xlsx')}>Descargar Excel</button>
        </div>
      </form>
      {descargando && <p role="status">Preparando la descarga…</p>}
      {aviso && <p className="aviso-admin" role="alert">{aviso}</p>}
      {sectores.error && <button className="accion" type="button" onClick={sectores.reintentar}>Reintentar carga de sectores</button>}
      {reporte.error?.status === 400
        ? <p className="aviso-admin" role="alert">{reporte.error.message}</p>
        : <EstadoConsulta consulta={reporte} nombre="el resumen" />}
      {reporte.datos && (
        <>
          <p>Total cobrado <strong>{formatoBolivianos(reporte.datos.totalCobrado)}</strong></p>
          {columnasReporte.map(([titulo, campo, columnas]) => (
            <section className="grupo-reporte" key={campo}>
              <h3>{titulo}</h3>
              {reporte.datos[campo].length
                ? <TablaAuditoria etiqueta={titulo} columnas={columnas}
                  filas={reporte.datos[campo].map((fila, id) => ({ ...fila, id }))} />
                : <p className="subtitulo">Sin registros.</p>}
            </section>
          ))}
        </>
      )}
    </section>
  );
}

export default function Auditoria({ token, accesoRechazado }) {
  const [seccion, setSeccion] = useState('cancelaciones');
  const secciones = [
    ['cancelaciones', 'Cancelaciones', Cancelaciones], ['bitacora', 'Bitácora', Bitacora],
    ['catalogo', 'Sectores y lugares', Catalogo], ['reportes', 'Reportes', Reportes],
  ];
  const Contenido = secciones.find(([id]) => id === seccion)[2];

  return (
    <div className="auditoria">
      <nav className="nav-auditoria" aria-label="Secciones de administración">
        {secciones.map(([id, etiqueta]) => (
          <button key={id} className="accion" type="button" aria-pressed={seccion === id} onClick={() => setSeccion(id)}>{etiqueta}</button>
        ))}
      </nav>
      <Contenido token={token} accesoRechazado={accesoRechazado} />
    </div>
  );
}