const { pool } = require('../config/db');

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

// Ejecuta el trabajo dentro de una transacción y la cierra siempre.
async function transaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try { await cliente.query('ROLLBACK'); } catch (_) { /* conexión inestable */ }
    throw error;
  } finally {
    cliente.release();
  }
}

function idValido(valor) {
  const n = Number(valor);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

module.exports = { errorHttp, transaccion, idValido };
