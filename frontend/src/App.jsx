import { useEffect, useState } from 'react';
import { listarSectores } from './api.js';
import { useDisponibilidad } from './useDisponibilidad.js';

const estados = {
  LIBRE: { texto: 'Libre', simbolo: '✓' },
  RESERVADO: { texto: 'Reservado', simbolo: '◷' },
  OCUPADO: { texto: 'Ocupado/pagado', simbolo: '×' },
};

const etiquetasDisponibilidad = {
  cargando: 'Consultando…',
  actualizado: 'Actualizado',
  'sin-datos': 'Sin actualizar',
};

function numeroLugar(numero) {
  return String(numero).padStart(2, '0');
}

function Simbolo({ estado }) {
  return <span className="simbolo" aria-hidden="true">{estados[estado].simbolo}</span>;
}

function PlanoSector({ sector }) {
  const { lugares, estado, idElegido, seleccionPerdida, seleccionar } = useDisponibilidad(sector.id);
  const elegido = lugares?.find((lugar) => lugar.id === idElegido);
  const mitad = Math.ceil((lugares?.length ?? 0) / 2);

  function renderLugar(lugar) {
    const numero = numeroLugar(lugar.numero);
    return (
      <button
        className="lugar"
        key={lugar.id}
        type="button"
        data-estado={lugar.estado}
        aria-label={`Lugar ${numero}, ${estados[lugar.estado].texto}`}
        aria-pressed={lugar.id === idElegido}
        disabled={lugar.estado !== 'LIBRE' || estado !== 'actualizado'}
        onClick={() => seleccionar(lugar.id)}
      >
        <strong>{numero}</strong>
        <Simbolo estado={lugar.estado} />
      </button>
    );
  }

  return (
    <>
      <section className="panel panel-plano" aria-labelledby="titulo-plano">
        <div className="encabezado-plano">
          <div>
            <h2 id="titulo-plano">{sector.nombre}</h2>
            <p className="subtitulo">{lugares?.length ?? sector.totalLugares} lugares · Plano esquemático</p>
          </div>
          <span className="actualizacion" data-actualizacion={estado} role="status">
            {etiquetasDisponibilidad[estado]}
          </span>
        </div>

        {estado === 'cargando' && <p className="mensaje">Cargando lugares…</p>}
        {estado === 'sin-datos' && (
          <p className="mensaje" role="status">No se pudo actualizar la disponibilidad. Reintentando…</p>
        )}
        {lugares?.length === 0 && <p className="mensaje">Este sector no tiene lugares activos.</p>}

        {lugares && lugares.length > 0 && (
          <>
            <ul className="leyenda" aria-label="Estados de los lugares">
              {Object.entries(estados).map(([estadoLugar, { texto }]) => (
                <li key={estadoLugar} data-estado={estadoLugar}>
                  <Simbolo estado={estadoLugar} />
                  {texto}
                  <strong>{lugares.filter((lugar) => lugar.estado === estadoLugar).length}</strong>
                </li>
              ))}
            </ul>
            <div className="plano">
              <div className="lugares">{lugares.slice(0, mitad).map(renderLugar)}</div>
              <div className="carril" aria-hidden="true">Carril de circulación</div>
              <div className="lugares">{lugares.slice(mitad).map(renderLugar)}</div>
            </div>
          </>
        )}
      </section>

      <section className="panel panel-seleccion" aria-labelledby="titulo-seleccion">
        <h2 id="titulo-seleccion">Tu selección</h2>
        <div role="status">
          {elegido ? (
            <div className="seleccion">
              <span className="numero-seleccion" aria-hidden="true">{numeroLugar(elegido.numero)}</span>
              <div>
                <strong>Lugar {numeroLugar(elegido.numero)}</strong>
                <p>{sector.nombre}</p>
              </div>
            </div>
          ) : (
            <p className="subtitulo">
              {seleccionPerdida
                ? 'El lugar seleccionado ya no está disponible. Elige otro lugar libre.'
                : 'Selecciona un lugar libre en el plano.'}
            </p>
          )}
        </div>
        {elegido && (
          <button className="accion quitar" type="button" onClick={() => seleccionar(elegido.id)}>
            Quitar selección
          </button>
        )}
      </section>
    </>
  );
}

export default function App() {
  const [sectores, setSectores] = useState(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [idSector, setIdSector] = useState(null);

  useEffect(() => {
    const peticion = new AbortController();
    let activo = true;
    const limite = setTimeout(() => peticion.abort(), 5000);

    listarSectores(peticion.signal)
      .then((datos) => { if (activo) setSectores(datos); })
      .catch(() => { if (activo) setError(true); })
      .finally(() => clearTimeout(limite));

    return () => {
      activo = false;
      clearTimeout(limite);
      peticion.abort();
    };
  }, [intento]);

  const sector = sectores?.find(({ id }) => id === idSector) ?? sectores?.[0];

  function reintentarSectores() {
    setError(false);
    setIntento((anterior) => anterior + 1);
  }

  return (
    <>
      <header className="cabecera">
        <div className="contenedor barra">
          <div className="marca"><span aria-hidden="true">P</span> Parqueo Tarija</div>
          <span className="ubicacion">Tarija, Bolivia</span>
        </div>
      </header>

      <main className="contenedor principal">
        <section className="portada" aria-labelledby="titulo-pagina">
          <h1 id="titulo-pagina">Encuentra tu lugar de parqueo</h1>
          <p>Elige un sector y consulta los lugares disponibles.</p>
        </section>

        <div className="distribucion">
          <section className="panel panel-sectores" aria-labelledby="titulo-sectores">
            <h2 id="titulo-sectores">Sectores</h2>
            {error && (
              <div className="mensaje">
                <p role="status">No se pudieron cargar los sectores.</p>
                <button className="accion" type="button" onClick={reintentarSectores}>Reintentar</button>
              </div>
            )}
            {!error && !sectores && <p className="mensaje" role="status">Cargando sectores…</p>}
            {sectores?.length === 0 && <p className="mensaje" role="status">No hay sectores disponibles.</p>}
            {sector && (
              <ul className="sectores">
                {sectores.map((opcion) => (
                  <li key={opcion.id}>
                    <button className="sector" type="button" aria-pressed={opcion.id === sector.id} onClick={() => setIdSector(opcion.id)}>
                      <strong>{opcion.nombre}</strong>
                      <span>{opcion.totalLugares} lugares</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {sector && <PlanoSector key={sector.id} sector={sector} />}
        </div>
      </main>
    </>
  );
}
