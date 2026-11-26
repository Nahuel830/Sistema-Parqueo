const asyncHandler = require('../utils/asyncHandler');
const s = require('../services/admin.service');

const enviar = (res, mensaje, datos, codigo = 200) => res.status(codigo).json({ ok: true, mensaje, datos });

module.exports = {
  lugares: asyncHandler(async (req, res) => enviar(res, 'Estado de todos los lugares', await s.listarLugares())),
  cancelaciones: asyncHandler(async (req, res) => enviar(res, 'Cancelaciones y expiraciones', await s.listarCancelaciones(req.query))),
  pagos: asyncHandler(async (req, res) => enviar(res, 'Pagos y fichas', await s.listarPagos(req.query))),
  resumen: asyncHandler(async (req, res) => enviar(res, 'Resumen de ingresos, ocupación y cancelaciones', await s.resumen(req.query))),
  bitacora: asyncHandler(async (req, res) => enviar(res, 'Bitácora de acciones', await s.listarBitacora(req.query))),
  tarifas: asyncHandler(async (req, res) => enviar(res, 'Tarifas vigentes', await s.listarTarifas())),
  cambiarTarifa: asyncHandler(async (req, res) => enviar(res, 'Tarifa actualizada', await s.cambiarTarifa(req.usuario, req.params.idSector, (req.body || {}).monto))),
  encargados: asyncHandler(async (req, res) => enviar(res, 'Encargados', await s.listarEncargados())),
  crearEncargado: asyncHandler(async (req, res) => enviar(res, 'Encargado creado', await s.crearEncargado(req.usuario, req.body || {}), 201)),
  editarEncargado: asyncHandler(async (req, res) => enviar(res, 'Encargado actualizado', await s.editarEncargado(req.usuario, req.params.id, req.body || {}))),
  contrasena: asyncHandler(async (req, res) => enviar(res, 'Contraseña restablecida', await s.restablecerContrasena(req.usuario, req.params.id, (req.body || {}).password))),
};
