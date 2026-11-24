import { useCallback, useRef, useState } from 'react';
import { consultarCatalogo, consultarTarifas, guardarLugar, guardarSector, guardarTarifa } from './apiAdmin.js';
import { useConsultaAdmin } from './useConsultaAdmin.js';

const bolivianos = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' });
const fechaBolivia = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: 'America/La_Paz' });
const estadoLugar = { LIBRE: 'Libre', RESERVADO: 'Reservado', OCUPADO: 'Ocupado/pagado' };

function siguienteId(registros) {
  return registros.reduce((maximo, { id }) => Math.max(maximo, id), 0) + 1;
}

function Editor({ editor, ocupado, cerrar, guardar, children }) {
  const { tipo, registro, desactivar } = editor;
  const titulo = desactivar ? `Desactivar ${tipo}` : registro ? `Editar ${tipo}` : `Crear ${tipo}`;

  return (
    <form className="formulario-admin editor-gestion" aria-label={titulo} onSubmit={(evento) => {
      evento.preventDefault();
      guardar(new FormData(evento.currentTarget));
    }}>
      <h3>{titulo}</h3>
      {children}
      <div className="acciones-filtros">
        <button className={`accion ${desactivar ? 'accion-cancelar' : 'accion-principal'}`} type="submit" disabled={ocupado}>
          {ocupado ? 'Guardando…' : desactivar ? 'Confirmar desactivación' : 'Guardar'}
        </button>
        <button className="accion" type="button" onClick={cerrar} disabled={ocupado}>Cancelar</button>
      </div>
    </form>
  );
}

function ProblemaConsulta({ consulta, mensaje }) {
  if (consulta.cargando) return <p className="subtitulo" role="status">Cargando…</p>;
  if (!consulta.error) return null;

  return (
    <div className="estado-auditoria">
      <p className="aviso-admin" role="alert">{mensaje}</p>
      <button className="accion" type="button" onClick={consulta.reintentar}>Reintentar</button>
    </div>
  );
}

export default function GestionParqueo({ token, accesoRechazado }) {
  const cargarCatalogo = useCallback((signal) => consultarCatalogo(token, signal), [token]);
  const cargarTarifas = useCallback((signal) => consultarTarifas(token, signal), [token]);
  const consultaCatalogo = useConsultaAdmin(cargarCatalogo, accesoRechazado);
  const consultaTarifas = useConsultaAdmin(cargarTarifas, accesoRechazado);
  const [idSector, setIdSector] = useState(null);
  const [prueba, setPrueba] = useState(null);
  const [editor, setEditor] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const guardando = useRef(false);

  const catalogo = prueba ?? consultaCatalogo.datos;
  const sectores = catalogo?.sectores;
  const sector = sectores?.find(({ id }) => id === idSector) ?? sectores?.[0];
  const tarifas = prueba ? prueba.tarifas : consultaTarifas.datos;
  const tarifa = tarifas?.find(({ idSector }) => idSector === sector?.id);
  const puedeEditar = Boolean(prueba || catalogo?.editable);

  function abrirEditor(datos) {
    setAviso(null);
    setEditor(datos);
  }

  async function ejecutar(tarea, mensaje) {
    if (guardando.current) return;
    guardando.current = true;
    setOcupado(true);
    setAviso(null);

    try {
      await tarea(AbortSignal.timeout(8000));
      setEditor(null);
      setAviso({ texto: mensaje });
    } catch (error) {
      if (error.status === 401 || error.status === 403) accesoRechazado();
      else setAviso({ error: true, texto: error.name === 'TimeoutError' || error instanceof TypeError
        ? 'No se pudo confirmar el cambio. Comprueba la conexión y vuelve a consultar los datos.'
        : error.message });
    } finally {
      guardando.current = false;
      setOcupado(false);
    }
  }

  function enviarSector(formulario) {
    const { registro, desactivar } = editor;
    const datos = desactivar ? { activo: false } : {
      nombre: formulario.get('nombre').trim(),
      descripcion: formulario.get('descripcion').trim() || null,
    };

    return ejecutar(async (signal) => {
      if (!desactivar && !datos.nombre) throw new Error('Escribe el nombre del sector.');
      if (prueba) {
        if (desactivar && registro.lugares.some(({ activo, estado }) => activo && estado !== 'LIBRE')) {
          throw new Error('El sector tiene lugares reservados u ocupados.');
        }
        if (!desactivar && sectores.some(({ id, nombre }) => id !== registro?.id && nombre === datos.nombre)) {
          throw new Error('Ya existe un sector con ese nombre.');
        }
        const actualizado = registro ? { ...registro, ...datos }
          : { id: siguienteId(sectores), activo: true, lugares: [], ...datos };
        const lista = registro ? sectores.map((elemento) => elemento.id === registro.id ? actualizado : elemento)
          : [...sectores, actualizado];
        setPrueba({ ...prueba, sectores: lista });
        setIdSector(actualizado.id);
      } else {
        const actualizado = await guardarSector(token, registro?.id, datos, signal);
        setIdSector(registro?.id ?? actualizado.id);
        consultaCatalogo.reintentar();
        if (desactivar) consultaTarifas.reintentar();
      }
    }, desactivar ? 'Sector desactivado.' : 'Sector guardado.');
  }

  function enviarLugar(formulario) {
    const { registro, desactivar } = editor;
    const datos = desactivar ? { activo: false } : { numero: Number(formulario.get('numero')) };

    return ejecutar(async (signal) => {
      if (!desactivar && (!Number.isInteger(datos.numero) || datos.numero < 1 || datos.numero > 2147483647)) {
        throw new Error('Ingresa un número de lugar válido.');
      }
      if (prueba) {
        if (desactivar && registro.estado !== 'LIBRE') throw new Error('El lugar está reservado u ocupado.');
        if (!desactivar && sector.lugares.some(({ id, numero }) => id !== registro?.id && numero === datos.numero)) {
          throw new Error('Ya existe un lugar con ese número en el sector.');
        }
        const actualizado = registro ? { ...registro, ...datos } : {
          id: siguienteId(sectores.flatMap(({ lugares }) => lugares)), activo: true, estado: 'LIBRE', ...datos,
        };
        const lugares = registro ? sector.lugares.map((elemento) => elemento.id === registro.id ? actualizado : elemento)
          : [...sector.lugares, actualizado];
        setPrueba({ ...prueba, sectores: sectores.map((elemento) => elemento.id === sector.id ? { ...sector, lugares } : elemento) });
      } else {
        await guardarLugar(token, sector.id, registro?.id, datos, signal);
        consultaCatalogo.reintentar();
      }
    }, desactivar ? 'Lugar desactivado.' : 'Lugar guardado.');
  }

  function enviarTarifa(formulario) {
    const monto = formulario.get('monto').trim().replace(',', '.');

    return ejecutar(async (signal) => {
      if (!/^\d{1,4}(\.\d{1,2})?$/.test(monto) || Number(monto) <= 0) {
        throw new Error('Ingresa un monto entre 0,01 y 9999,99 Bs con hasta dos decimales.');
      }
      if (prueba) {
        const nueva = { idSector: sector.id, monto, vigenteDesde: new Date().toISOString() };
        setPrueba({ ...prueba, tarifas: [...tarifas.filter(({ idSector }) => idSector !== sector.id), nueva] });
      } else {
        await guardarTarifa(token, sector.id, monto, signal);
        consultaTarifas.reintentar();
      }
    }, 'Tarifa actualizada.');
  }

  function cambiarPrueba() {
    abrirEditor(null);
    setPrueba(prueba ? null : { ...catalogo, tarifas: tarifas ?? [] });
  }

  const cerrarEditor = () => abrirEditor(null);

  return (
    <section className="panel panel-gestion" aria-labelledby="titulo-gestion">
      <h2 id="titulo-gestion">Catálogo de sectores</h2>
      {aviso && <p className={aviso.error ? 'aviso-admin' : 'confirmacion-gestion'} role={aviso.error ? 'alert' : 'status'}>{aviso.texto}</p>}
      <ProblemaConsulta consulta={consultaCatalogo} mensaje="No se pudo consultar el catálogo." />

      {catalogo && !catalogo.editable && (
        <div className="estado-gestion" data-prueba={Boolean(prueba)}>
          <p>{prueba
            ? 'Modo de prueba. Los cambios se descartan al salir y no se envían al servidor.'
            : 'La API aún no permite editar sectores ni lugares. Las tarifas sí se pueden guardar.'}</p>
          <button className="accion" type="button" disabled={ocupado} onClick={cambiarPrueba}>
            {prueba ? 'Salir de la prueba' : 'Probar edición local'}
          </button>
        </div>
      )}

      {catalogo && (
        <div className="gestion-sector">
          {sectores.length > 0 ? (
            <div className="formulario-admin">
              <label>
                <span id="etiqueta-sector-gestion">Sector</span>
                <select aria-labelledby="etiqueta-sector-gestion" disabled={ocupado} value={sector.id} onChange={(evento) => {
                  setIdSector(Number(evento.target.value));
                  cerrarEditor();
                }}>
                  {sectores.map(({ id, nombre, activo }) => <option key={id} value={id}>{nombre}{activo ? '' : ' · Inactivo'}</option>)}
                </select>
              </label>
            </div>
          ) : <p className="subtitulo">No hay sectores registrados.</p>}

          {sector?.descripcion && editor?.tipo !== 'sector' && <p className="subtitulo">{sector.descripcion}</p>}
          {puedeEditar && (
            <div className="acciones-filtros">
              <button className="accion accion-principal" type="button" disabled={ocupado} onClick={() => abrirEditor({ tipo: 'sector' })}>Crear sector</button>
              {sector && <button className="accion" type="button" disabled={ocupado} onClick={() => abrirEditor({ tipo: 'sector', registro: sector })}>Editar sector</button>}
              {sector?.activo && <button className="accion accion-cancelar" type="button" disabled={ocupado} onClick={() => abrirEditor({ tipo: 'sector', registro: sector, desactivar: true })}>Desactivar sector</button>}
            </div>
          )}

          {editor?.tipo === 'sector' && (
            <Editor key={editor.desactivar ? 'sector-desactivar' : `sector-${editor.registro?.id}`} editor={editor} ocupado={ocupado} cerrar={cerrarEditor} guardar={enviarSector}>
              {editor.desactivar ? <p>¿Desactivar «{editor.registro.nombre}»?</p> : (
                <>
                  <label>Nombre<input name="nombre" defaultValue={editor.registro?.nombre} maxLength={80} required /></label>
                  <label>Descripción<textarea name="descripcion" defaultValue={editor.registro?.descripcion ?? ''} maxLength={200} rows={2} /></label>
                </>
              )}
            </Editor>
          )}
        </div>
      )}

      {sector && (
        <div className="gestion-detalles">
          <section className="bloque-gestion" aria-labelledby="titulo-lugares-gestion">
            <header className="encabezado-auditoria">
              <h3 id="titulo-lugares-gestion">Lugares</h3>
              {puedeEditar && sector.activo && <button className="accion accion-principal" type="button" disabled={ocupado} onClick={() => abrirEditor({ tipo: 'lugar' })}>Crear lugar</button>}
            </header>
            {editor?.tipo === 'lugar' && (
              <Editor key={editor.desactivar ? `lugar-desactivar-${editor.registro.id}` : `lugar-${editor.registro?.id}`} editor={editor} ocupado={ocupado} cerrar={cerrarEditor} guardar={enviarLugar}>
                {editor.desactivar ? <p>¿Desactivar el lugar {editor.registro.numero}?</p> : (
                  <label>Número del lugar<input name="numero" type="number" min={1} max={2147483647} step={1} defaultValue={editor.registro?.numero} required /></label>
                )}
              </Editor>
            )}
            {sector.lugares.length === 0 ? <p className="subtitulo">Este sector todavía no tiene lugares.</p> : (
              <ul className="lista-gestion" aria-label="Lugares del sector">
                {[...sector.lugares].sort((a, b) => a.numero - b.numero).map((lugar) => (
                  <li key={lugar.id}>
                    <div>
                      <strong>Lugar {String(lugar.numero).padStart(2, '0')}</strong>
                      <span className="estado-lugar-gestion" data-estado={lugar.activo ? lugar.estado : 'INACTIVO'}>
                        {lugar.activo ? estadoLugar[lugar.estado] : 'Inactivo'}
                      </span>
                    </div>
                    {puedeEditar && <div className="acciones-filtros">
                      <button className="accion" type="button" aria-label={`Editar lugar ${lugar.numero}`} disabled={ocupado} onClick={() => abrirEditor({ tipo: 'lugar', registro: lugar })}>Editar</button>
                      {lugar.activo && <button className="accion accion-cancelar" type="button" aria-label={`Desactivar lugar ${lugar.numero}`} disabled={ocupado} onClick={() => abrirEditor({ tipo: 'lugar', registro: lugar, desactivar: true })}>Desactivar</button>}
                    </div>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bloque-gestion bloque-tarifa" aria-labelledby="titulo-tarifa-gestion">
            <h3 id="titulo-tarifa-gestion">Tarifa del sector</h3>
            {!prueba && <ProblemaConsulta consulta={consultaTarifas} mensaje="No se pudo consultar la tarifa." />}
            {tarifas && editor?.tipo !== 'tarifa' && (
              <>
                <p className="tarifa-gestion">{tarifa ? bolivianos.format(Number(tarifa.monto)) : 'Sin tarifa vigente'}</p>
                {tarifa && <p className="subtitulo">Vigente desde el {fechaBolivia.format(new Date(tarifa.vigenteDesde))}</p>}
                {sector.activo && <button className="accion" type="button" disabled={ocupado} onClick={() => abrirEditor({ tipo: 'tarifa', registro: tarifa })}>{tarifa ? 'Cambiar tarifa' : 'Configurar tarifa'}</button>}
                {!sector.activo && <p className="subtitulo">El sector está inactivo.</p>}
              </>
            )}
            {editor?.tipo === 'tarifa' && (
              <Editor editor={editor} ocupado={ocupado} cerrar={cerrarEditor} guardar={enviarTarifa}>
                <label>Monto en bolivianos<input name="monto" inputMode="decimal" defaultValue={tarifa?.monto ?? ''} maxLength={7} required /></label>
              </Editor>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
