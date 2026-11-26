import { lazy, Suspense, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { esSectorPalacio } from './datos/sectorPalacio.js';

const MapaPalacio3D = lazy(() => import('./MapaPalacio3D.jsx'));

const moneda = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const horaBolivia = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz',
});

function ImagenQr({ codigo, imagenQr }) {
  const [imagen, setImagen] = useState(imagenQr || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (imagenQr) return;
    let activo = true;
    QRCode.toDataURL(codigo, { width: 256, margin: 3 })
      .then((datos) => { if (activo) setImagen(datos); })
      .catch(() => { if (activo) setError(true); });
    return () => { activo = false; };
  }, [codigo, imagenQr]);

  if (error) return <p className="subtitulo" role="status">No se pudo mostrar la imagen del QR.</p>;
  if (!imagen) return <p className="subtitulo" role="status">Preparando la imagen del QR…</p>;
  return <img className="imagen-qr" src={imagen} alt="Código QR de pago" onError={() => setError(true)} />;
}

function Ficha({ datos, ocultar }) {
  const efectivoPendiente = datos.metodo === 'EFECTIVO' && datos.estadoPago === 'PENDIENTE';

  return (
    <>
      <dl className="datos-ficha">
        <div className="codigo-ficha"><dt>Código único</dt><dd>{datos.codigo}</dd></div>
        <div><dt>Sector</dt><dd>{datos.sector}</dd></div>
        <div><dt>Lugar</dt><dd>{String(datos.numeroLugar).padStart(2, '0')}</dd></div>
        <div><dt>Monto</dt><dd>{moneda.format(Number(datos.monto))} Bs</dd></div>
        <div><dt>Método de pago</dt><dd>{datos.metodo === 'EFECTIVO' ? 'Efectivo' : 'QR'}</dd></div>
        <div className="fecha-ficha"><dt>Fecha y hora</dt><dd><time dateTime={datos.fechaEmision}>{horaBolivia.format(new Date(datos.fechaEmision))}</time></dd></div>
      </dl>
      {esSectorPalacio(datos.sector) && (
        <div className="mapa3d-contenedor">
          <Suspense fallback={<p className="subtitulo">Cargando vista 3D…</p>}>
            <MapaPalacio3D lugarNumero={datos.numeroLugar} alto={300} />
          </Suspense>
        </div>
      )}
      {datos.estadoPago === 'CONFIRMADO' && <p className="subtitulo" role="status">Pago confirmado.</p>}
      {efectivoPendiente && <p className="subtitulo">Presenta la ficha y paga al encargado del sector.</p>}
      <button className="accion" type="button" onClick={ocultar}>Ocultar ficha</button>
    </>
  );
}

export default function PanelPago({ gestionPago, reserva, segundos, cancelando }) {
  const { fichaVisible, fichas, qr, ocupado, aviso, pagar, ocultarFicha, volverAVer } = gestionPago;
  const fichasConsultables = reserva ? fichas.filter(({ id }) => id === reserva.id) : fichas;
  const puedePagar = reserva && segundos > 0 && fichasConsultables.length === 0;

  if (fichaVisible) {
    return <div className="detalle-pago"><Ficha datos={fichaVisible.ficha} ocultar={ocultarFicha} /></div>;
  }

  if (!puedePagar && fichasConsultables.length === 0 && !aviso && !ocupado) return null;

  return (
    <div className="detalle-pago">
      {puedePagar && (
        <>
          <p className="monto-pago"><span>Monto a pagar</span><strong>{moneda.format(Number(reserva.monto))} Bs</strong></p>
          {qr ? (
            <>
              <ImagenQr key={qr.imagenQr || qr.codigoQr} codigo={qr.codigoQr} imagenQr={qr.imagenQr} />
              {qr.simulado && <p className="subtitulo">QR de prueba. No realiza un cobro.</p>}
              <p className="subtitulo" role="status">Esperando confirmación del pago por QR.</p>
            </>
          ) : (
            <button className="accion accion-principal" type="button" disabled={ocupado || cancelando} onClick={() => pagar('QR')}>Pagar por QR</button>
          )}
          <button className="accion" type="button" disabled={ocupado || cancelando} onClick={() => pagar('EFECTIVO')}>Pagar en efectivo</button>
        </>
      )}
      {ocupado && <p className="subtitulo" role="status">Consultando…</p>}
      {aviso && <p className="subtitulo" role="status">{aviso}</p>}
      {fichasConsultables.map((credencial) => (
        <button className="accion" key={credencial.id} type="button" disabled={ocupado || cancelando} onClick={() => volverAVer(credencial)}>
          {fichasConsultables.length === 1 ? 'Volver a ver ficha' : `Ver ficha ${credencial.codigo}`}
        </button>
      ))}
    </div>
  );
}
