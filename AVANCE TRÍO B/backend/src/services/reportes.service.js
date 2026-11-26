const PDFDocument = require('pdfkit');
const escribirExcel = require('write-excel-file/node');
const { formatearEnBolivia } = require('../utils/fecha');

const moneda = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function secciones(reporte) {
  return [
    {
      nombre: 'Ingresos por sector y método',
      columnas: ['Sector', 'Método', 'Cobros', 'Total (Bs)'],
      filas: reporte.ingresosPorSectorYMetodo.map(({ sector, metodo, cantidad, total }) =>
        [sector, metodo, cantidad, Number(total)]),
    },
    {
      nombre: 'Ocupación actual',
      columnas: ['Sector', 'Estado', 'Lugares'],
      filas: reporte.ocupacionActual.map(({ sector, estado, cantidad }) => [sector, estado, cantidad]),
    },
    {
      nombre: 'Cancelaciones por tipo',
      columnas: ['Tipo', 'Cantidad'],
      filas: reporte.cancelacionesPorTipo.map(({ tipo, cantidad }) => [tipo, cantidad]),
    },
  ];
}

function generarPdf(seccionesReporte, total, ambito) {
  const doc = new PDFDocument({ size: 'A4', margin: 42, info: { Title: 'Reporte de parqueo' } });
  const partes = [];
  const archivo = new Promise((resolve, reject) => {
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });
  doc.fillColor('#133b2e').font('Helvetica-Bold').fontSize(24).text('Reporte de parqueo');
  doc.fillColor('#333333').font('Helvetica').fontSize(11).moveDown(0.5).text(ambito);
  doc.font('Helvetica-Bold').moveDown().text(`Total cobrado: Bs ${moneda.format(total)}`);
  for (const { nombre, columnas, filas } of seccionesReporte) {
    if (doc.y > doc.page.height - 135) doc.addPage();
    doc.moveDown().fontSize(13).fillColor('#133b2e').font('Helvetica-Bold').text(nombre);
    doc.moveDown(0.4).fontSize(10).fillColor('#252525').font('Helvetica');
    if (!filas.length) {
      doc.text('Sin registros');
      continue;
    }

    const ancho = doc.page.width - 2 * doc.page.margins.left;
    const anchos = [ancho * 0.46, ...columnas.slice(1).map(() => ancho * 0.54 / (columnas.length - 1))];
    function fila(celdas, encabezado) {
      let x = doc.page.margins.left;
      const y = doc.y;
      doc.font(encabezado ? 'Helvetica-Bold' : 'Helvetica');
      const altura = Math.max(...celdas.map((celda, i) => doc.heightOfString(celda, { width: anchos[i] - 10 }))) + 10;
      if (encabezado) doc.rect(x, y, ancho, altura).fill('#e7f1eb').fillColor('#133b2e');
      celdas.forEach((celda, i) => {
        doc.text(celda, x + 5, y + 5, { width: anchos[i] - 10, align: i === 0 ? 'left' : 'right' });
        x += anchos[i];
      });
      doc.x = doc.page.margins.left;
      doc.y = y + altura;
    }
    fila(columnas, true);
    for (const datosFila of filas) {
      const celdas = datosFila.map((valor, i) => i === 3 ? moneda.format(valor) : String(valor));
      doc.font('Helvetica');
      const altura = Math.max(...celdas.map((celda, i) => doc.heightOfString(celda, { width: anchos[i] - 10 }))) + 10;
      if (doc.y + altura + 5 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage().font('Helvetica-Bold').fontSize(13).text(nombre).moveDown(0.4).fontSize(10);
        fila(columnas, true);
      }
      fila(celdas, false);
    }
  }
  doc.end();
  return archivo;
}

function generarExcel(seccionesReporte, total, ambito) {
  const dinero = (value) => ({ value, type: Number, format: '#,##0.00' });
  return escribirExcel([
    {
      sheet: 'Resumen',
      columns: [{ width: 86 }, { width: 20 }],
      data: [
        [{ value: 'Reporte de parqueo', fontWeight: 'bold', fontSize: 16 }],
        [ambito],
        ['Total cobrado (Bs)', dinero(total)],
      ],
    },
    ...seccionesReporte.map(({ nombre, columnas, filas }) => ({
      sheet: nombre,
      columns: columnas.map((_, i) => ({ width: i === 0 ? 48 : 17 })),
      stickyRowsCount: 1,
      data: [
        columnas.map((value) => ({ value, fontWeight: 'bold', color: '#133b2e', backgroundColor: '#e7f1eb' })),
        ...filas.map((fila) => fila.map((valor, i) => i === 3 ? dinero(valor) : valor)),
      ],
    })),
  ]).toBuffer();
}

function exportarResumen(formato, reporte, filtros) {
  const ambito = `Generado ${formatearEnBolivia()} · Desde ${filtros.desde || 'el inicio'} · Hasta ${filtros.hasta || 'sin límite'}`
    + (filtros.idSector ? ` · Sector #${Number(filtros.idSector)}` : ' · Todos los sectores');
  const total = Number(reporte.totalCobrado);
  return formato === 'pdf' ? generarPdf(secciones(reporte), total, ambito) : generarExcel(secciones(reporte), total, ambito);
}

module.exports = { exportarResumen };
