const test = require('node:test');
const assert = require('node:assert/strict');
const asyncHandler = require('../src/utils/asyncHandler');

function peticion() {
  return { params: {}, query: {}, body: {} };
}
function respuestaFalsa() {
  const r = { codigo: null, cuerpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.cuerpo = b; return r; };
  return r;
}

test('asyncHandler_ControladorExitoso_DevuelveLaRespuesta', async () => {
  // Arrange
  const controlador = asyncHandler(async (req, res) => {
    res.status(200).json({ ok: true });
  });
  const res = respuestaFalsa();

  // Act
  await controlador(peticion(), res, () => assert.fail('no debe llamar next'));

  // Assert
  assert.equal(res.codigo, 200);
  assert.deepEqual(res.cuerpo, { ok: true });
});

test('asyncHandler_ErrorSincrono_LlamaNextConElError', async () => {
  // Arrange
  const fallo = new Error('fallo de prueba');
  fallo.status = 418;
  const controlador = asyncHandler(async () => { throw fallo; });

  // Act
  let capturado = null;
  await controlador(peticion(), respuestaFalsa(), (e) => { capturado = e; });

  // Assert
  assert.equal(capturado, fallo);
  assert.equal(capturado.status, 418);
});

test('asyncHandler_ErrorRechazado_LlamaNextConElError', async () => {
  // Arrange
  const fallo = new Error('rechazo');
  const controlador = asyncHandler(() => Promise.reject(fallo));

  // Act
  let capturado = null;
  await controlador(peticion(), respuestaFalsa(), (e) => { capturado = e; });

  // Assert
  assert.equal(capturado, fallo);
});
