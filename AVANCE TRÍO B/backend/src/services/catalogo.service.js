const { pool } = require('../config/db');
const { errorHttp, transaccion } = require('../utils/http');

const datosSector = 'id_sector AS id, nombre, descripcion, total_lugares AS "totalLugares", activo';
const datosLugar = 'id_lugar AS id, id_sector AS "idSector", numero, estado, activo';

function entero(valor, campo) {
  if (!['number', 'string'].includes(typeof valor) || !/^\d+$/.test(String(valor))
      || Number(valor) < 1 || Number(valor) > 2147483647) {
    throw errorHttp(400, `${campo} debe ser un entero positivo`);
  }
  return Number(valor);
}

function texto(valor, campo, maximo) {
  if (typeof valor !== 'string' || valor.trim().length > maximo || valor.includes('\0')) {
    throw errorHttp(400, `${campo} debe tener hasta ${maximo} caracteres`);
  }
  return valor.trim();
}

function estadoActivo(valor) {
  if (valor !== undefined && typeof valor !== 'boolean') throw errorHttp(400, 'activo debe ser booleano');
  return valor;
}

async function sectorBloqueado(cliente, id) {
  const { rows: [sector] } = await cliente.query(`SELECT ${datosSector} FROM sector WHERE id_sector = $1 FOR UPDATE`, [id]);
  if (!sector) throw errorHttp(404, 'Sector no encontrado');
  return sector;
}

async function auditar(cliente, admin, entidad, anterior, actual) {
  const estado = (registro) => registro.activo ? 'ACTIVO' : 'DESACTIVADO';
  await cliente.query(
    `INSERT INTO bitacora (id_usuario, entidad, id_entidad, accion, estado_anterior, estado_nuevo)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [admin.id, entidad, actual.id, anterior ? `EDICION_${entidad}` : `CREACION_${entidad}`,
      anterior ? estado(anterior) : null, estado(actual)]
  );
}

async function listarSectores() {
  const { rows } = await pool.query(`SELECT ${datosSector} FROM sector ORDER BY nombre`);
  return rows;
}

async function guardarSector(admin, idCrudo, datos) {
  const creando = idCrudo === undefined;
  const id = creando ? null : entero(idCrudo, 'Sector');
  const nombre = datos.nombre === undefined && !creando ? undefined : texto(datos.nombre, 'Nombre', 80);
  if (nombre === '') throw errorHttp(400, 'El nombre del sector es obligatorio');
  const descripcion = 'descripcion' in datos ? texto(datos.descripcion ?? '', 'Descripción', 200) || null : undefined;
  const activo = estadoActivo(datos.activo);
  const monto = creando ? String(datos.monto ?? '') : null;
  if (creando && (!/^\d{1,4}(\.\d{1,2})?$/.test(monto) || Number(monto) <= 0)) {
    throw errorHttp(400, 'La tarifa inicial debe estar entre 0.01 y 9999.99 Bs');
  }
  if (!creando && nombre === undefined && descripcion === undefined && activo === undefined) {
    throw errorHttp(400, 'Indica los datos del sector que deseas cambiar');
  }

  try {
    return await transaccion(async (cliente) => {
      const anterior = creando ? null : await sectorBloqueado(cliente, id);
      let actual;
      if (creando) {
        const resultado = await cliente.query(
          `INSERT INTO sector (nombre, descripcion, activo) VALUES ($1, $2, $3) RETURNING ${datosSector}`,
          [nombre, descripcion ?? null, activo ?? true]
        );
        [actual] = resultado.rows;
        await cliente.query('INSERT INTO tarifa (id_sector, monto) VALUES ($1, $2)', [actual.id, monto]);
      } else {
        if (anterior.activo && activo === false) {
          const { rowCount } = await cliente.query(
            "SELECT 1 FROM lugar WHERE id_sector = $1 AND estado <> 'LIBRE' LIMIT 1", [id]
          );
          if (rowCount) throw errorHttp(409, 'El sector tiene lugares reservados u ocupados');
        }
        const resultado = await cliente.query(
          `UPDATE sector SET nombre = $2, descripcion = $3, activo = $4 WHERE id_sector = $1
           RETURNING ${datosSector}`,
          [id, nombre ?? anterior.nombre, descripcion === undefined ? anterior.descripcion : descripcion, activo ?? anterior.activo]
        );
        [actual] = resultado.rows;
      }
      await auditar(cliente, admin, 'SECTOR', anterior, actual);
      return actual;
    });
  } catch (error) {
    if (error.constraint === 'uk_sector_nombre') throw errorHttp(409, 'Ya existe un sector con ese nombre');
    throw error;
  }
}

async function listarLugaresDelSector(idCrudo) {
  const id = entero(idCrudo, 'Sector');
  const { rows: [sector] } = await pool.query(`SELECT ${datosSector} FROM sector WHERE id_sector = $1`, [id]);
  if (!sector) throw errorHttp(404, 'Sector no encontrado');
  const { rows } = await pool.query(`SELECT ${datosLugar} FROM lugar WHERE id_sector = $1 ORDER BY numero`, [id]);
  return { sector, lugares: rows };
}

async function guardarLugar(admin, idSectorCrudo, idCrudo, datos) {
  const idSector = entero(idSectorCrudo, 'Sector');
  const creando = idCrudo === undefined;
  const id = creando ? null : entero(idCrudo, 'Lugar');
  const numero = datos.numero === undefined && !creando ? undefined : entero(datos.numero, 'Número de lugar');
  const activo = estadoActivo(datos.activo);
  if (!creando && numero === undefined && activo === undefined) throw errorHttp(400, 'Indica número o estado activo');

  try {
    return await transaccion(async (cliente) => {
      await sectorBloqueado(cliente, idSector);
      let anterior = null;
      let resultado;
      if (creando) {
        resultado = await cliente.query(
          `INSERT INTO lugar (id_sector, numero, activo) VALUES ($1, $2, $3) RETURNING ${datosLugar}`,
          [idSector, numero, activo ?? true]
        );
      } else {
        const consulta = await cliente.query(
          `SELECT ${datosLugar} FROM lugar WHERE id_sector = $1 AND id_lugar = $2 FOR UPDATE`, [idSector, id]
        );
        [anterior] = consulta.rows;
        if (!anterior) throw errorHttp(404, 'Lugar no encontrado en el sector');
        if (anterior.estado !== 'LIBRE' && (activo === false || (numero !== undefined && numero !== anterior.numero))) {
          throw errorHttp(409, 'Solo se pueden desactivar o renumerar lugares libres');
        }
        resultado = await cliente.query(
          `UPDATE lugar SET numero = $2, activo = $3 WHERE id_lugar = $1 RETURNING ${datosLugar}`,
          [id, numero ?? anterior.numero, activo ?? anterior.activo]
        );
      }
      const [actual] = resultado.rows;
      await cliente.query(
        `UPDATE sector SET total_lugares = (SELECT COUNT(*) FROM lugar WHERE id_sector = $1 AND activo)
         WHERE id_sector = $1`, [idSector]
      );
      await auditar(cliente, admin, 'LUGAR', anterior, actual);
      return actual;
    });
  } catch (error) {
    if (error.constraint === 'uk_lugar_sector_numero') throw errorHttp(409, 'Ya existe ese número en el sector');
    throw error;
  }
}

module.exports = { listarSectores, guardarSector, listarLugaresDelSector, guardarLugar };
