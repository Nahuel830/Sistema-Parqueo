import { useCallback, useState } from 'react';
import { accionFicha, consultarFicha, consultarFichas, marcarNotificacionLeida } from './apiAdmin.js';
import { useSondeo } from './useSondeo.js';

const formatoFecha = new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/La_Paz' });
const fechaHora = (valor) => (valor ? formatoFecha.format(new Date(valor)) : '—');
const dinero = (valor) => `${Number(valor).toFixed(2).replace('.', ',')} Bs`;

const ESTADOS_FICHA = { EMITIDA: 'Emitida', VERIFICADA: 'Verificada', PAGADA: 'Pagada', ANULADA: 'Anulada' };
const ESTADOS_PAGO = { PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', RECHAZADO: 'Rechazado' };
const METODOS = { QR: 'QR', EFECTIVO: 'Efectivo' };

// Qué puede hacer el encargado según el estado de la ficha y de su pago.
function accionesDisponibles(ficha) {
  if (ficha.estado === 'EMITIDA' && ficha.metodo === 'EFECTIVO' && ficha.estadoPago === 'PENDIENTE') {
    return [{ id: 'cobrar', etiqueta: 'Registrar cobro en efectivo', pregunta: `Confirma que cobraste ${dinero(ficha.monto)} en efectivo.`, hecho: 'Cobro en efectivo registrado.' }];
  }
  if (ficha.estado === 'EMITIDA' && ficha.estadoPago === 'CONFIRMADO') {
    return [{ id: 'verificar', etiqueta: 'Verificar ficha', pregunta: 'Confirma que la ficha coincide con la del conductor y con su vehículo.', hecho: 'Ficha verificada.' }];
  }
  if (ficha.estado === 'VERIFICADA') {
    return [{ id: 'pagada', etiqueta: 'Marcar como pagada', pregunta: 'Confirma que el conductor ya puede usar el lugar.', hecho: 'Ficha marcada como pagada.' }];
  }
  return [];
}

function Insignia({ estado, etiquetas }) {
  return <span className="insignia-estado" data-estado={estado}>{etiquetas[estado] ?? estado}</span>;
}

function Dato({ titulo, children }) {
  return (
    <div className="dato-ficha">
      <dt>{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DetalleFicha({ token, codigo, accesoRechazado, alCambiar, cerrar }) {
  const consultar = useCallback((signal) => consultarFicha(token, codigo, signal), [token, codigo]);
  const consulta = useSondeo(consultar, accesoRechazado, 5000);
  const [pendiente, setPendiente] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const ficha = consulta.datos;

  async function ejecutar() {
    if (!pendiente || enviando) return;
    setEnviando(true);
    setAviso(null);
    try {
      await accionFicha(token, codigo, pendiente.id);
      setAviso({ mensaje: pendiente.hecho });
      consulta.actualizar();
      alCambiar();
    } catch (error) {
      if (error.status === 401 || error.status === 403) accesoRechazado();
      else {
        setAviso({ error: true, mensaje: error.status ? error.message : 'No se pudo conectar con el servidor.' });
        consulta.actualizar();
        alCambiar();
      }
    } finally {
      setPendiente(null);
      setEnviando(false);
    }
  }

  return (
    <section className="detalle-ficha panel" aria-labelledby="titulo-detalle-ficha">
      <div className="encabezado-auditoria">
        <h3 id="titulo-detalle-ficha">Ficha {codigo}</h3>
        <button className="accion" type="button" onClick={cerrar}>Cerrar</button>
      </div>
      {consulta.cargando && <p role="status">Cargando ficha…</p>}
      {!ficha && consulta.error && <p className="aviso-admin" role="alert">{consulta.error.status ? consulta.error.message : 'No se pudo cargar la ficha.'}</p>}
      {ficha && (
        <>
          <dl className="datos-ficha">
            <Dato titulo="Sector">{ficha.sector}</Dato>
            <Dato titulo="Lugar">{ficha.numeroLugar}</Dato>
            <Dato titulo="Placa">{ficha.placa || 'No indicada'}</Dato>
            <Dato titulo="Monto">{dinero(ficha.monto)}</Dato>
            <Dato titulo="Método de pago">{METODOS[ficha.metodo] ?? ficha.metodo}</Dato>
            <Dato titulo="Estado del pago"><Insignia estado={ficha.estadoPago} etiquetas={ESTADOS_PAGO} /></Dato>
            <Dato titulo="Estado de la ficha"><Insignia estado={ficha.estado} etiquetas={ESTADOS_FICHA} /></Dato>
            <Dato titulo="Emitida">{fechaHora(ficha.fechaEmision)}</Dato>
            <Dato titulo="Verificada">{fechaHora(ficha.fechaVerificacion)}</Dato>
          </dl>
          {ficha.estado === 'ANULADA' && <p className="aviso-admin">Esta ficha fue anulada: la reserva venció o el conductor la canceló. No cobres ni apruebes.</p>}
          {aviso && <p role={aviso.error ? 'alert' : 'status'} className={aviso.error ? 'aviso-admin' : ''}>{aviso.mensaje}</p>}
          {pendiente ? (
            <div className="salida-encargado">
              <p>{pendiente.pregunta}</p>
              <div className="acciones-filtros">
                <button className="accion accion-principal" type="button" onClick={ejecutar} disabled={enviando}>{enviando ? 'Guardando…' : 'Confirmar'}</button>
                <button className="accion" type="button" onClick={() => setPendiente(null)} disabled={enviando}>Volver</button>
              </div>
            </div>
          ) : (
            <div className="acciones-filtros">
              {accionesDisponibles(ficha).map((accion) => (
                <button key={accion.id} className="accion accion-principal" type="button" onClick={() => { setAviso(null); setPendiente(accion); }}>{accion.etiqueta}</button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function FichasEncargado({ token, accesoRechazado, nuevas, idDe, alCambiar }) {
  const [estado, setEstado] = useState('');
  const [fecha, setFecha] = useState('');
  const [todas, setTodas] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [codigo, setCodigo] = useState(null);

  const cargar = useCallback(
    (signal) => consultarFichas(token, { estado, fecha: todas ? 'todas' : fecha }, signal),
    [token, estado, fecha, todas],
  );
  const consulta = useSondeo(cargar, accesoRechazado, 5000);

  async function abrir(codigoFicha) {
    setCodigo(codigoFicha);
    if (nuevas.includes(codigoFicha)) {
      try {
        await marcarNotificacionLeida(token, idDe(codigoFicha));
        alCambiar();
      } catch {
        // Marcar la notificación como leída es opcional; la ficha se abre igual.
      }
    }
  }

  function buscar(evento) {
    evento.preventDefault();
    const limpio = busqueda.trim().toUpperCase();
    if (limpio) abrir(limpio);
  }

  const fichas = consulta.datos;

  return (
    <div className="panel-gestion">
      <section className="panel auditoria" aria-labelledby="titulo-fichas">
        <div className="encabezado-auditoria">
          <h2 id="titulo-fichas">Fichas de mi sector</h2>
          <button className="accion" type="button" onClick={consulta.actualizar}>Actualizar</button>
        </div>
        <p className="pie-auditoria">La lista se actualiza sola cada 5 segundos.</p>

        <form className="formulario-admin" onSubmit={buscar}>
          <label>Buscar por código de ficha
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="PQ-XXXXXXXXXXXXXXXX" autoComplete="off" maxLength={19} />
          </label>
          <div className="acciones-filtros"><button className="accion accion-principal" type="submit" disabled={!busqueda.trim()}>Abrir ficha</button></div>
        </form>

        <div className="formulario-admin filtros-auditoria">
          <label>Estado
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ESTADOS_FICHA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </label>
          <label>Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={todas} />
          </label>
          <label className="opcion-simple"><input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Todas las fechas</label>
        </div>
        <p className="pie-auditoria">{todas ? 'Se muestran las fichas de todas las fechas.' : fecha ? `Fichas del ${fecha}.` : 'Se muestran las fichas de hoy.'}</p>

        {consulta.cargando && <p className="estado-auditoria" role="status">Cargando fichas…</p>}
        {!fichas && consulta.error && <p className="aviso-admin" role="alert">No se pudieron cargar las fichas.</p>}
        {fichas?.length === 0 && <p className="estado-auditoria" role="status">No hay fichas con esos filtros.</p>}
        {fichas?.length > 0 && (
          <div className="tabla-auditoria" tabIndex={0} role="region" aria-label="Fichas de mi sector">
            <table>
              <thead>
                <tr>
                  {['Código', 'Lugar', 'Método', 'Monto', 'Pago', 'Ficha', 'Emitida', ''].map((t, i) => <th key={i} scope="col">{t || 'Acción'}</th>)}
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f.codigo} data-nueva={nuevas.includes(f.codigo)}>
                    <td data-columna="Código"><span className="etiqueta-celda" aria-hidden="true">Código</span><div><code>{f.codigo}</code>{nuevas.includes(f.codigo) && <span className="etiqueta-nueva">Nueva</span>}</div></td>
                    <td data-columna="Lugar"><span className="etiqueta-celda" aria-hidden="true">Lugar</span><div>{f.numeroLugar}</div></td>
                    <td data-columna="Método"><span className="etiqueta-celda" aria-hidden="true">Método</span><div>{METODOS[f.metodo] ?? f.metodo}</div></td>
                    <td data-columna="Monto"><span className="etiqueta-celda" aria-hidden="true">Monto</span><div>{dinero(f.monto)}</div></td>
                    <td data-columna="Pago"><span className="etiqueta-celda" aria-hidden="true">Pago</span><div><Insignia estado={f.estadoPago} etiquetas={ESTADOS_PAGO} /></div></td>
                    <td data-columna="Ficha"><span className="etiqueta-celda" aria-hidden="true">Ficha</span><div><Insignia estado={f.estado} etiquetas={ESTADOS_FICHA} /></div></td>
                    <td data-columna="Emitida"><span className="etiqueta-celda" aria-hidden="true">Emitida</span><div><time dateTime={f.fechaEmision}>{fechaHora(f.fechaEmision)}</time></div></td>
                    <td data-columna="Acción"><div><button className="accion" type="button" onClick={() => abrir(f.codigo)}>Ver</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {codigo && (
        <DetalleFicha key={codigo} token={token} codigo={codigo} accesoRechazado={accesoRechazado}
          alCambiar={() => { consulta.actualizar(); alCambiar(); }} cerrar={() => setCodigo(null)} />
      )}
    </div>
  );
}
