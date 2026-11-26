process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_de_prueba_local_de_mas_de_32_caracteres';
process.env.RUTA_ENV = process.env.RUTA_ENV || '/nonexistent';

const test = require('node:test');
const assert = require('node:assert/strict');
const admin = require('../src/services/admin.service');

const ADMIN = { id: 1 };
const falla400 = (promesa) => assert.rejects(promesa, (e) => e.status === 400);

// Estas validaciones ocurren antes de tocar la base de datos.
test('cambiarTarifa_MontoNegativo_Lanza400', () => falla400(admin.cambiarTarifa(ADMIN, 1, '-3')));
test('cambiarTarifa_MontoCero_Lanza400', () => falla400(admin.cambiarTarifa(ADMIN, 1, '0')));
test('cambiarTarifa_MontoConLetras_Lanza400', () => falla400(admin.cambiarTarifa(ADMIN, 1, 'abc')));
test('cambiarTarifa_TresDecimales_Lanza400', () => falla400(admin.cambiarTarifa(ADMIN, 1, '3.555')));
test('cambiarTarifa_MontoVacio_Lanza400', () => falla400(admin.cambiarTarifa(ADMIN, 1, undefined)));
test('cambiarTarifa_SectorInvalido_Lanza400', () => falla400(admin.cambiarTarifa(ADMIN, 'x', '3')));

const base = { username: 'enc.prueba', nombreCompleto: 'Encargado Prueba', idSector: 1, password: 'Clave-Valida-1' };
test('crearEncargado_ContrasenaCorta_Lanza400', () => falla400(admin.crearEncargado(ADMIN, { ...base, password: 'a1' })));
test('crearEncargado_ContrasenaSinNumeros_Lanza400', () => falla400(admin.crearEncargado(ADMIN, { ...base, password: 'SoloLetrasAqui' })));
test('crearEncargado_ContrasenaDeMasDe72_Lanza400', () => falla400(admin.crearEncargado(ADMIN, { ...base, password: 'a1'.repeat(40) })));
test('crearEncargado_UsernameConEspacios_Lanza400', () => falla400(admin.crearEncargado(ADMIN, { ...base, username: 'con espacio' })));
test('crearEncargado_SinNombre_Lanza400', () => falla400(admin.crearEncargado(ADMIN, { ...base, nombreCompleto: '  ' })));
test('crearEncargado_SectorInvalido_Lanza400', () => falla400(admin.crearEncargado(ADMIN, { ...base, idSector: 0 })));

test('editarEncargado_SinCambios_Lanza400', () => falla400(admin.editarEncargado(ADMIN, 5, {})));
test('editarEncargado_ActivoNoBooleano_Lanza400', () => falla400(admin.editarEncargado(ADMIN, 5, { activo: 'no' })));
test('editarEncargado_IdInvalido_Lanza400', () => falla400(admin.editarEncargado(ADMIN, 'abc', { activo: false })));
test('restablecerContrasena_ContrasenaDebil_Lanza400', () => falla400(admin.restablecerContrasena(ADMIN, 5, '123')));

test('listarCancelaciones_FechaInvalida_Lanza400', () => falla400(admin.listarCancelaciones({ desde: 'hoy' })));
test('listarCancelaciones_TipoInvalido_Lanza400', () => falla400(admin.listarCancelaciones({ tipo: 'XX' })));
test('listarPagos_MetodoInvalido_Lanza400', () => falla400(admin.listarPagos({ metodo: 'TARJETA' })));
test('listarPagos_SectorInvalido_Lanza400', () => falla400(admin.listarPagos({ idSector: '-1' })));

test('listarBitacora_FechaDesdeInvalida_Lanza400', () => falla400(admin.listarBitacora({ desde: '2026/11/01' })));
test('listarBitacora_FechaHastaInvalida_Lanza400', () => falla400(admin.listarBitacora({ hasta: 'ayer' })));
test('listarBitacora_FechaValida_NoLanzaErrorDeValidacion', async () => {
  // La fecha AAAA-MM-DD es válida; sin base de datos la consulta falla
  // por conexión, pero nunca con error 400 de validación.
  try {
    await admin.listarBitacora({ desde: '2026-11-01', hasta: '2026-11-30' });
  } catch (e) {
    assert.notEqual(e.status, 400);
  }
});
