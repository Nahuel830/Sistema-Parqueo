import { useCallback, useEffect, useState } from 'react';
import Cabecera from '../Cabecera.jsx';
import { consultarSesion, iniciarSesion } from './apiAdmin.js';
import Auditoria from './Auditoria.jsx';
import './admin.css';

const claveSesion = 'parqueo-tarija:sesion-admin';

function recuperarToken() {
  try { return sessionStorage.getItem(claveSesion); } catch { return null; }
}

function guardarToken(token) {
  try {
    if (token) sessionStorage.setItem(claveSesion, token);
    else sessionStorage.removeItem(claveSesion);
  } catch {
    // Si el navegador bloquea el almacenamiento, la sesión vive en memoria.
  }
}

function AccesoAdmin({ aviso, alEntrar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function ingresar(evento) {
    evento.preventDefault();
    if (enviando) return;
    const formulario = new FormData(evento.currentTarget);
    setEnviando(true);
    setError('');
    try {
      const datos = await iniciarSesion({
        username: formulario.get('username').trim(),
        password: formulario.get('password'),
      }, AbortSignal.timeout(8000));
      if (datos.usuario.rol !== 'ADMIN') {
        setError('Esta cuenta no tiene acceso de administrador.');
        return;
      }
      alEntrar(datos);
    } catch (error) {
      setError(error.status ? error.message : 'No se pudo conectar para iniciar sesión.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="panel acceso-admin" aria-labelledby="titulo-acceso">
      <h2 id="titulo-acceso">Acceso del administrador</h2>
      {(error || aviso) && <p className="aviso-admin" role="alert">{error || aviso}</p>}
      <form className="formulario-admin" onSubmit={ingresar}>
        <label>Usuario<input name="username" autoComplete="username" required /></label>
        <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="accion accion-principal" type="submit" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
    </section>
  );
}

export default function AdminApp() {
  const [sesion, setSesion] = useState(() => {
    const token = recuperarToken();
    return token ? { token, usuario: null } : null;
  });
  const [aviso, setAviso] = useState('');
  const [errorSesion, setErrorSesion] = useState(false);
  const [intento, setIntento] = useState(0);

  const cerrarSesion = useCallback((mensaje = '') => {
    guardarToken(null);
    setSesion(null);
    setErrorSesion(false);
    setAviso(mensaje);
  }, []);

  const accesoRechazado = useCallback(() => {
    cerrarSesion('Tu sesión ya no tiene acceso. Vuelve a iniciar sesión.');
  }, [cerrarSesion]);

  function entrar(datos) {
    guardarToken(datos.token);
    setSesion({ token: datos.token, usuario: datos.usuario });
    setAviso('');
  }

  useEffect(() => {
    if (!sesion || sesion.usuario) return;
    const controlador = new AbortController();
    const signal = AbortSignal.any([controlador.signal, AbortSignal.timeout(8000)]);

    consultarSesion(sesion.token, signal)
      .then((usuario) => {
        if (controlador.signal.aborted) return;
        if (usuario.rol !== 'ADMIN') accesoRechazado();
        else setSesion({ token: sesion.token, usuario });
      })
      .catch((error) => {
        if (controlador.signal.aborted) return;
        if (error.status === 401 || error.status === 403) accesoRechazado();
        else setErrorSesion(true);
      });

    return () => controlador.abort();
  }, [sesion, intento, accesoRechazado]);

  return (
    <>
      <Cabecera>
        <div className="acciones-cabecera">
          <a className="enlace-cabecera" href="/">Vista pública</a>
          {sesion && <button className="accion" type="button" onClick={() => cerrarSesion()}>Cerrar sesión</button>}
        </div>
      </Cabecera>
      <main className="contenedor principal admin">
        <section className="portada" aria-labelledby="titulo-admin">
          <h1 id="titulo-admin">Administración del parqueo</h1>
        </section>

        {!sesion && <AccesoAdmin aviso={aviso} alEntrar={entrar} />}
        {sesion && !sesion.usuario && (
          <section className="panel acceso-admin" aria-label="Sesión de administrador">
            {errorSesion ? (
              <>
                <p className="aviso-admin" role="alert">No se pudo verificar tu sesión.</p>
                <button className="accion" type="button" onClick={() => {
                  setErrorSesion(false);
                  setIntento((valor) => valor + 1);
                }}>Reintentar</button>
              </>
            ) : <p role="status">Verificando sesión…</p>}
          </section>
        )}
        {sesion?.usuario && <Auditoria token={sesion.token} accesoRechazado={accesoRechazado} />}
      </main>
    </>
  );
}
