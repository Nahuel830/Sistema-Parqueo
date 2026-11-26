import { useState, useEffect } from 'react';
import { consultar, guardar } from './apiAdmin.js';

export default function GestionEncargados({ token, accesoRechazado }) {
  const [encargados, setEncargados] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el Modal (Formulario)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(false); // false = Crear, true = Editar
  const [formData, setFormData] = useState({ id: null, nombre: '', username: '', password: '', sector: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  // 1. Cargar la lista desde el backend
  const cargarEncargados = async () => {
    try {
      setCargando(true);
      // Ruta que debe crear el Trío B
      const datos = await consultar('/admin/encargados', token); 
      setEncargados(datos);
    } catch (err) {
      if (err.status === 401 || err.status === 403) accesoRechazado();
      else console.warn("Backend no disponible o ruta no creada aún.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEncargados();
  }, []);

  // 2. Abrir Modal para Crear
  const abrirCrear = () => {
    setEditando(false);
    setFormData({ id: null, nombre: '', username: '', password: '', sector: '' });
    setErrorModal('');
    setModalAbierto(true);
  };

  // 3. Abrir Modal para Editar
  const abrirEditar = (enc) => {
    setEditando(true);
    setFormData({ 
      id: enc.id, 
      nombre: enc.nombre || '', 
      username: enc.username || '', 
      password: '', // La contraseña no se carga por seguridad
      sector: enc.sector || '' 
    });
    setErrorModal('');
    setModalAbierto(true);
  };

  // 4. Guardar (Crear o Editar)
  const guardarFormulario = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrorModal('');
    
    try {
      if (editando) {
        // Ruta para editar (Trío B debe crearla)
        await guardar(`/admin/encargados/${formData.id}`, token, 'PUT', formData);
      } else {
        // Ruta para crear (Trío B debe crearla)
        await guardar('/admin/encargados', token, 'POST', formData);
      }
      setModalAbierto(false);
      cargarEncargados(); // Recargar la tabla
    } catch (err) {
      setErrorModal(err.message || 'Error al guardar. Verifica la conexión con el backend.');
    } finally {
      setGuardando(false);
    }
  };

  // 5. Resetear Contraseña
  const resetearPassword = async (id) => {
    if (!window.confirm("¿Seguro que deseas resetear la contraseña de este encargado?")) return;
    try {
      await guardar(`/admin/encargados/${id}/reset-password`, token, 'POST', {});
      alert("Contraseña reseteada exitosamente.");
    } catch (err) {
      alert("Error al resetear contraseña. (El backend debe implementar esta ruta)");
    }
  };

  // 6. Desactivar
  const desactivarEncargado = async (id) => {
    if (!window.confirm("¿Seguro que deseas desactivar a este encargado?")) return;
    try {
      await guardar(`/admin/encargados/${id}/desactivar`, token, 'PATCH', {});
      cargarEncargados();
    } catch (err) {
      alert("Error al intentar desactivar al encargado.");
    }
  };

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Gestión de Encargados (RF-29, RF-30)</h2>
        <button className="accion accion-principal" onClick={abrirCrear}>+ Nuevo Encargado</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f4f4f4' }}>
              <th style={{ padding: '12px' }}>Nombre</th>
              <th style={{ padding: '12px' }}>Usuario</th>
              <th style={{ padding: '12px' }}>Sector</th>
              <th style={{ padding: '12px' }}>Estado</th>
              <th style={{ padding: '12px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {encargados.map((enc) => (
              <tr key={enc.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{enc.nombre || 'N/A'}</td>
                <td style={{ padding: '12px' }}>{enc.username}</td>
                <td style={{ padding: '12px' }}>{enc.sectorNombre || enc.sector || 'Sin asignar'}</td>
                <td style={{ padding: '12px' }}>{enc.activo ? '🟢 Activo' : '🔴 Inactivo'}</td>
                <td style={{ padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="accion" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => abrirEditar(enc)}>Editar</button>
                  <button className="accion" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => resetearPassword(enc.id)}>Reset Pass</button>
                  {enc.activo && (
                    <button className="accion" onClick={() => desactivarEncargado(enc.id)} style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: '#ffcccc', color: '#cc0000', border: 'none' }}>Desactivar</button>
                  )}
                </td>
              </tr>
            ))}
            {encargados.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                  {cargando ? 'Cargando...' : 'No hay encargados registrados o el backend no está disponible.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL (VENTANA EMERGENTE) PARA CREAR/EDITAR */}
      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>{editando ? 'Editar Encargado' : 'Nuevo Encargado'}</h3>
            
            {errorModal && <p style={{ color: 'red', fontSize: '14px' }}>{errorModal}</p>}
            
            <form onSubmit={guardarFormulario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                Nombre Completo:
                <input required type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} style={{ padding: '8px' }} />
              </label>
              
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                Nombre de Usuario:
                <input required type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} style={{ padding: '8px' }} />
              </label>
              
              {!editando && (
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  Contraseña Inicial:
                  <input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ padding: '8px' }} />
                </label>
              )}

              <label style={{ display: 'flex', flexDirection: 'column' }}>
                ID del Sector Asignado:
                <input required type="text" value={formData.sector} onChange={(e) => setFormData({...formData, sector: e.target.value})} placeholder="Ej: 1" style={{ padding: '8px' }} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button type="button" className="accion" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="accion accion-principal" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}