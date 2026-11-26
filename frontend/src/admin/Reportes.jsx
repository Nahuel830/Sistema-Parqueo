import { useState } from 'react';
import { consultarReporte, descargarReporte } from './apiAdmin.js';

export default function Reportes({ token, accesoRechazado }) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const manejarBusqueda = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      // Llama a la API con los filtros
      const res = await consultarReporte(token, { fechaInicio, fechaFin });
      setDatos(res);
    } catch (err) {
      if (err.status === 401 || err.status === 403) accesoRechazado();
      else setError('Error al cargar el reporte. Verifica la conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const manejarDescarga = async (formato) => {
    try {
      await descargarReporte(token, { fechaInicio, fechaFin }, formato);
    } catch (err) {
      if (err.status === 401 || err.status === 403) accesoRechazado();
      else setError('Error al descargar el reporte.');
    }
  };

  return (
    <section className="panel">
      <h2>Reportes y Exportación (RF-33 a RF-35)</h2>
      
      <form onSubmit={manejarBusqueda} style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          Desde:
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ padding: '8px', marginTop: '5px' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          Hasta:
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={{ padding: '8px', marginTop: '5px' }} />
        </label>
        <button type="submit" className="accion accion-principal" disabled={cargando} style={{ height: '38px' }}>
          {cargando ? 'Buscando...' : 'Generar Reporte'}
        </button>
      </form>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      {datos ? (
        <div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', flex: '1', minWidth: '200px', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Ingresos Totales</h3>
              <p style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{datos.ingresosTotales || 0} Bs</p>
            </div>
            <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', flex: '1', minWidth: '200px', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Ocupación Promedio</h3>
              <p style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{datos.ocupacionPromedio || 0}%</p>
            </div>
            <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', flex: '1', minWidth: '200px', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Efectivo vs QR</h3>
              <p style={{ fontSize: '18px', margin: 0 }}>
                💵 {datos.efectivo || 0} Bs / 📱 {datos.qr || 0} Bs
              </p>
            </div>
          </div>

          <h3>Exportar Datos</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => manejarDescarga('pdf')} className="accion" style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none' }}>Descargar PDF</button>
            <button onClick={() => manejarDescarga('excel')} className="accion" style={{ backgroundColor: '#27ae60', color: 'white', border: 'none' }}>Descargar Excel</button>
          </div>
        </div>
      ) : (
        <p style={{ color: '#666' }}>Selecciona un rango de fechas y presiona "Generar Reporte" para ver los datos.</p>
      )}
    </section>
  );
}