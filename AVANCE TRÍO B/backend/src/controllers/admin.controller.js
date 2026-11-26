const asyncHandler = require('../utils/asyncHandler');
const s = require('../services/admin.service');
const catalogo = require('../services/catalogo.service');
const { exportarResumen } = require('../services/reportes.service');
const { errorHttp } = require('../utils/http');

const enviar = (res, mensaje, datos, codigo = 200) => res.status(codigo).json({ ok: true, mensaje, datos });

module.exports = {
  lugares: asyncHandler(async (req, res) => enviar(res, 'Estado de todos los lugares', await s.listarLugares())),
  sectores: asyncHandler(async (req, res) => enviar(res, 'Sectores de parqueo', await catalogo.listarSectores())),
  crearSector: asyncHandler(async (req, res) => enviar(res, 'Sector creado', await catalogo.guardarSector(req.usuario, undefined, req.body || {}), 201)),
  editarSector: asyncHandler(async (req, res) => enviar(res, 'Sector actualizado', await catalogo.guardarSector(req.usuario, req.params.idSector, req.body || {}))),
  lugaresDelSector: asyncHandler(async (req, res) => enviar(res, 'Lugares del sector', await catalogo.listarLugaresDelSector(req.params.idSector))),
  crearLugar: asyncHandler(async (req, res) => enviar(res, 'Lugar creado', await catalogo.guardarLugar(req.usuario, req.params.idSector, undefined, req.body || {}), 201)),
  editarLugar: asyncHandler(async (req, res) => enviar(res, 'Lugar actualizado', await catalogo.guardarLugar(req.usuario, req.params.idSector, req.params.id, req.body || {}))),
  cancelaciones: asyncHandler(async (req, res) => enviar(res, 'Cancelaciones y expiraciones', await s.listarCancelaciones(req.query))),
  pagos: asyncHandler(async (req, res) => enviar(res, 'Pagos y fichas', await s.listarPagos(req.query))),
  resumen: asyncHandler(async (req, res) => enviar(res, 'Resumen de ingresos, ocupación y cancelaciones', await s.resumen(req.query))),
  exportarResumen: asyncHandler(async (req, res) => {
    const { formato } = req.params;
    if (!['pdf', 'xlsx'].includes(formato)) throw errorHttp(400, 'Formato inválido: elige PDF o XLSX');
    const resumen = await s.resumen(req.query);
    const archivo = await exportarResumen(formato, resumen, req.query);
    res.set('Cache-Control', 'no-store').attachment(`reporte-parqueo.${formato}`).send(archivo);
  }),
  bitacora: asyncHandler(async (req, res) => enviar(res, 'Bitácora de acciones', await s.listarBitacora(req.query))),
  tarifas: asyncHandler(async (req, res) => enviar(res, 'Tarifas vigentes', await s.listarTarifas())),
  cambiarTarifa: asyncHandler(async (req, res) => enviar(res, 'Tarifa actualizada', await s.cambiarTarifa(req.usuario, req.params.idSector, (req.body || {}).monto))),
  encargados: asyncHandler(async (req, res) => enviar(res, 'Encargados', await s.listarEncargados())),
  crearEncargado: asyncHandler(async (req, res) => enviar(res, 'Encargado creado', await s.crearEncargado(req.usuario, req.body || {}), 201)),
  editarEncargado: asyncHandler(async (req, res) => enviar(res, 'Encargado actualizado', await s.editarEncargado(req.usuario, req.params.id, req.body || {}))),
  contrasena: asyncHandler(async (req, res) => enviar(res, 'Contraseña restablecida', await s.restablecerContrasena(req.usuario, req.params.id, (req.body || {}).password))),
};
