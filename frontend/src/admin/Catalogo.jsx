import { useState, useEffect } from 'react';
import { consultar, guardar } from './apiAdmin.js';

export default function Catalogo({ token, accesoRechazado }) {
  const [sectores, setSectores] = useState([]);
  const [sectorSeleccionado, setSectorSeleccionado] = useState(null);
  const [lugares, setLugares] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Modales
  const [modalSector, setModalSector] = useState(false);
  const [formSector, setFormSector] = useState({ id: null, nombre: '', tarifa: '' });

  const cargarSectores = async () => {
    try {
      setCargando(true);
      const datos = await consultar('/admin/sectores', token); // Asumiendo que devuelve lista de objetos
      setSectores(datos);
    } catch (err) {
      if (err.status === 401 || err.status === 403) accesoRechazado();
    } finally {
      setCargando(false);
    }
  };

  const cargarLugares = async (sectorId) => {
    try {
      const datos = await consultar(`/admin/sectores/${sectorId}/lugares`, token);
      setLugares(datos);
    } catch (err) {
      setLugares([]);
    }
  };

  useEffect(() => {
    cargarSectores();
  }, []);

  const seleccionarSector = (sector) => {
    setSectorSeleccionado(sector);
    cargarLugares(sector.id);
  };

  // Guardar Sector (Crear/Editar)
  const guardarSectorForm = async (e) => {
    e.preventDefault();
    try {
      if (formSector.id) {
        await guardar(`/admin/sectores/${formSector.id}`, token, 'PUT', formSector);
      } else {
        await guardar('/admin/sectores', token, 'POST', formSector);
      }
      setModalSector(false);
      cargarSectores();
    } catch (err) {
      alert("Error al guardar el sector.");
    }
  };

  // Desactivar Sector
  const desactivarSector = async (id) => {
    if (!window.confirm("¿Desactivar este sector? (Los lugares quedarán inactivos)")) return;
    try {
      await guardar(`/admin/sectores/${id}/desactivar`, token, 'PATCH', {});
      cargarSectores();
      if (sectorSeleccionado?.id === id) setSectorSeleccionado(null);
    } catch (err) {
      alert("Error al desactivar.");
    }
  };

  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Gestión de Sectores y Tarifas (RF-27, RF-28)</h2>
        <button className="accion accion-principal" onClick={() => {
          setFormSector({ id: null, nombre: '', tarifa: '' });
          setModalSector(true);
        }}>+ Nuevo Sector</button>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* LISTA DE SECTORES */}
        <div style={{ flex: '1', minWidth: '300px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>Sectores</h3>
          {cargando ? <p>Cargando...</p> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {sectores.map(s => (
                <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee', backgroundColor: sectorSeleccionado?.id === s.id ? '#e6f2ff' : 'transparent', cursor: 'pointer' }} onClick={() => seleccionarSector(s)}>
                  <span><strong>{s.nombre}</strong> (Tarifa: {s.tarifa} Bs)</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="accion" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={(e) => { e.stopPropagation(); setFormSector(s); setModalSector(true); }}>Editar</button>
                    <button className="accion" style={{ padding: '2px 8px', fontSize: '12px', backgroundColor: '#ffcccc', color: 'red' }} onClick={(e) => { e.stopPropagation(); desactivarSector(s.id); }}>X</button>
                  </div>
                </li>
              ))}
              {sectores.length === 0 && <p>No hay sectores.</p>}
            </ul>
          )}
        </div>

        {/* LISTA DE LUGARES DEL SECTOR SELECCIONADO */}
        <div style={{ flex: '1', minWidth: '300px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3>Lugares de {sectorSeleccionado ? sectorSeleccionado.nombre : '(Selecciona un sector)'}</h3>
            {sectorSeleccionado && <button className="accion" onClick={() => alert('Aquí abrirías el modal para crear lugar')}>+ Añadir Lugar</button>}
          </div>
          
          {sectorSeleccionado ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {lugares.map(l => (
                <li key={l.id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lugar {l.numero} {l.activo ? '🟢' : '🔴'}</span>
                  <button className="accion" style={{ padding: '2px 8px', fontSize: '12px' }}>Editar</button>
                </li>
              ))}
              {lugares.length === 0 && <p>Este sector no tiene lugares registrados.</p>}
            </ul>
          ) : (
            <p style={{ color: '#666' }}>Haz clic en un sector de la izquierda para ver sus lugares.</p>
          )}
        </div>
      </div>

      {/* MODAL SECTOR */}
      {modalSector && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px' }}>
            <h3>{formSector.id ? 'Editar Sector' : 'Nuevo Sector'}</h3>
            <form onSubmit={guardarSectorForm} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label>
                Nombre del Sector (Ej. A, B, Calle 1):
                <input required type="text" value={formSector.nombre} onChange={(e) => setFormSector({...formSector, nombre: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </label>
              <label>
                Tarifa por Hora (Bs):
                <input required type="number" step="0.01" value={formSector.tarifa} onChange={(e) => setFormSector({...formSector, tarifa: e.target.value})} style={{ width: '100%', padding: '8px' }} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="accion" onClick={() => setModalSector(false)}>Cancelar</button>
                <button type="submit" className="accion accion-principal">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}