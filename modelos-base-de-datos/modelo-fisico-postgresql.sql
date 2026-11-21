-- Parqueo Digital Tarija. Instalación inicial en una base de datos existente.
-- Ejecutar el archivo completo en pgAdmin (Query Tool) o con psql -v ON_ERROR_STOP=1.
-- Requiere un esquema parqueo nuevo. Todos los objetos se crean en una transacción.
-- Importes en bolivianos. Fechas con zona horaria.
-- Supuestos: un pago completo por estadía; personal con rol encargado o administrador.
BEGIN;
SET LOCAL TIME ZONE 'America/La_Paz';
CREATE SCHEMA parqueo;
SET LOCAL search_path = parqueo, pg_catalog;

CREATE TABLE sector (
    id_sector BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL CHECK (btrim(nombre) <> ''),
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cuadra (
    id_cuadra BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_sector BIGINT NOT NULL REFERENCES sector ON DELETE RESTRICT,
    calle VARCHAR(150) NOT NULL CHECK (btrim(calle) <> ''),
    entre_calles VARCHAR(250) NOT NULL,
    capacidad INTEGER NOT NULL CHECK (capacidad > 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tarifa (
    id_tarifa BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuadra BIGINT NOT NULL REFERENCES cuadra ON DELETE RESTRICT,
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0 AND monto <> 'NaN'::numeric),
    vigente_desde TIMESTAMPTZ NOT NULL,
    vigente_hasta TIMESTAMPTZ,
    CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde),
    UNIQUE (id_cuadra, vigente_desde)
);

CREATE TABLE usuario (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_acceso VARCHAR(80) NOT NULL UNIQUE CHECK (btrim(nombre_acceso) <> ''),
    nombre_completo VARCHAR(180) NOT NULL CHECK (btrim(nombre_completo) <> ''),
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('ENCARGADO', 'ADMINISTRADOR')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Autenticación y almacenamiento de credenciales se integran con la aplicación.

CREATE TABLE conductor (
    id_conductor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_conductor VARCHAR(40) NOT NULL UNIQUE CHECK (btrim(codigo_conductor) <> ''),
    nombre_completo VARCHAR(180) NOT NULL CHECK (btrim(nombre_completo) <> ''),
    telefono VARCHAR(30),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE vehiculo (
    placa VARCHAR(20) PRIMARY KEY CHECK (btrim(placa) <> '' AND placa = upper(btrim(placa))),
    id_conductor BIGINT REFERENCES conductor ON DELETE RESTRICT
);

CREATE TABLE billetera (
    id_billetera BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_conductor BIGINT NOT NULL UNIQUE REFERENCES conductor ON DELETE RESTRICT,
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
        CHECK (estado IN ('ACTIVA', 'BLOQUEADA', 'CERRADA'))
);

CREATE TABLE estacionamiento (
    id_estacionamiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    placa VARCHAR(20) NOT NULL REFERENCES vehiculo ON DELETE RESTRICT,
    id_tarifa BIGINT NOT NULL REFERENCES tarifa ON DELETE RESTRICT,
    id_usuario_entrada BIGINT NOT NULL REFERENCES usuario ON DELETE RESTRICT,
    fecha_hora_entrada TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    importe_aplicado NUMERIC(12,2) NOT NULL
        CHECK (importe_aplicado > 0 AND importe_aplicado <> 'NaN'::numeric)
);

CREATE TABLE cierre_estadia (
    id_estacionamiento BIGINT PRIMARY KEY REFERENCES estacionamiento ON DELETE RESTRICT,
    fecha_hora_salida TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario_salida BIGINT REFERENCES usuario ON DELETE RESTRICT
);
COMMENT ON COLUMN cierre_estadia.id_usuario_salida IS
    'NULL indica cierre automático; una salida manual identifica al usuario.';

CREATE TABLE asignacion_cuadra (
    id_usuario BIGINT NOT NULL REFERENCES usuario ON DELETE RESTRICT,
    id_cuadra BIGINT NOT NULL REFERENCES cuadra ON DELETE RESTRICT,
    fecha_desde TIMESTAMPTZ NOT NULL,
    fecha_hasta TIMESTAMPTZ,
    PRIMARY KEY (id_usuario, id_cuadra, fecha_desde),
    CHECK (fecha_hasta IS NULL OR fecha_hasta > fecha_desde)
);

CREATE TABLE bitacora (
    id_bitacora BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuario ON DELETE RESTRICT,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accion VARCHAR(80) NOT NULL,
    entidad_afectada VARCHAR(80) NOT NULL,
    identificador_afectado VARCHAR(100) NOT NULL,
    valor_anterior JSONB,
    valor_nuevo JSONB,
    origen VARCHAR(40) NOT NULL
);
COMMENT ON TABLE bitacora IS
    'La aplicación registra los eventos. identificador_afectado es una referencia polimórfica, sin FK.';

CREATE TABLE recarga (
    id_recarga BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_billetera BIGINT NOT NULL REFERENCES billetera ON DELETE RESTRICT,
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0 AND monto <> 'NaN'::numeric),
    canal VARCHAR(20) NOT NULL CHECK (canal IN ('QR', 'DEPOSITO')),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'RECHAZADA')),
    referencia_bancaria VARCHAR(150),
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movimiento_saldo (
    id_movimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    concepto TEXT NOT NULL CHECK (btrim(concepto) <> '')
);

CREATE TABLE credito_recarga (
    id_movimiento BIGINT PRIMARY KEY REFERENCES movimiento_saldo ON DELETE RESTRICT,
    id_recarga BIGINT NOT NULL UNIQUE REFERENCES recarga ON DELETE RESTRICT
);

CREATE TABLE ajuste_saldo (
    id_movimiento BIGINT PRIMARY KEY REFERENCES movimiento_saldo ON DELETE RESTRICT,
    id_billetera BIGINT NOT NULL REFERENCES billetera ON DELETE RESTRICT,
    importe_con_signo NUMERIC(12,2) NOT NULL
        CHECK (importe_con_signo <> 0 AND importe_con_signo <> 'NaN'::numeric)
);

CREATE TABLE pago (
    id_pago BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_estacionamiento BIGINT NOT NULL UNIQUE REFERENCES estacionamiento ON DELETE RESTRICT,
    fecha_hora_pago TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pago_saldo (
    id_pago BIGINT PRIMARY KEY REFERENCES pago ON DELETE RESTRICT,
    id_movimiento BIGINT NOT NULL UNIQUE REFERENCES movimiento_saldo ON DELETE RESTRICT,
    id_billetera BIGINT NOT NULL REFERENCES billetera ON DELETE RESTRICT
);

CREATE TABLE pago_efectivo (
    id_pago BIGINT PRIMARY KEY REFERENCES pago ON DELETE RESTRICT,
    id_usuario_cobro BIGINT NOT NULL REFERENCES usuario ON DELETE RESTRICT
);

CREATE TABLE comprobante (
    id_comprobante BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_comprobante VARCHAR(60) NOT NULL UNIQUE CHECK (btrim(numero_comprobante) <> ''),
    id_pago BIGINT UNIQUE REFERENCES pago ON DELETE RESTRICT,
    id_recarga BIGINT UNIQUE REFERENCES recarga ON DELETE RESTRICT,
    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comprobante_operacion_exclusiva
        CHECK ((id_pago IS NOT NULL) <> (id_recarga IS NOT NULL))
);

CREATE TABLE notificacion (
    id_notificacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_conductor BIGINT NOT NULL REFERENCES conductor ON DELETE RESTRICT,
    tipo VARCHAR(40) NOT NULL,
    mensaje TEXT NOT NULL CHECK (btrim(mensaje) <> ''),
    fecha_envio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMPTZ,
    CHECK (fecha_lectura IS NULL OR fecha_lectura >= fecha_envio)
);

CREATE TABLE aviso_estadia (
    id_notificacion BIGINT PRIMARY KEY REFERENCES notificacion ON DELETE RESTRICT,
    id_estacionamiento BIGINT NOT NULL REFERENCES estacionamiento ON DELETE RESTRICT
);

CREATE TABLE aviso_recarga (
    id_notificacion BIGINT PRIMARY KEY REFERENCES notificacion ON DELETE RESTRICT,
    id_recarga BIGINT NOT NULL REFERENCES recarga ON DELETE RESTRICT
);

-- Índices de claves foráneas sin cobertura por PK/UNIQUE.
CREATE INDEX idx_cuadra_sector ON cuadra (id_sector);
CREATE INDEX idx_vehiculo_conductor ON vehiculo (id_conductor);
CREATE INDEX idx_estadia_vehiculo_fecha ON estacionamiento (placa, fecha_hora_entrada);
CREATE INDEX idx_estadia_tarifa ON estacionamiento (id_tarifa);
CREATE INDEX idx_estadia_usuario ON estacionamiento (id_usuario_entrada);
CREATE INDEX idx_cierre_usuario ON cierre_estadia (id_usuario_salida);
CREATE INDEX idx_asignacion_cuadra ON asignacion_cuadra (id_cuadra);
CREATE INDEX idx_bitacora_usuario_fecha ON bitacora (id_usuario, fecha_hora);
CREATE INDEX idx_bitacora_entidad ON bitacora (entidad_afectada, identificador_afectado);
CREATE INDEX idx_recarga_billetera_fecha ON recarga (id_billetera, fecha_solicitud);
CREATE INDEX idx_ajuste_billetera ON ajuste_saldo (id_billetera);
CREATE INDEX idx_pago_saldo_billetera ON pago_saldo (id_billetera);
CREATE INDEX idx_pago_efectivo_usuario ON pago_efectivo (id_usuario_cobro);
CREATE INDEX idx_notificacion_conductor_fecha ON notificacion (id_conductor, fecha_envio);
CREATE INDEX idx_aviso_estadia ON aviso_estadia (id_estacionamiento);
CREATE INDEX idx_aviso_recarga ON aviso_recarga (id_recarga);

-- Consultas derivadas del modelo normalizado.
CREATE VIEW parqueo.v_asientos_saldo AS
SELECT m.id_movimiento, r.id_billetera, m.fecha_hora, m.concepto,
       'CREDITO'::text AS tipo, r.monto AS importe
FROM parqueo.movimiento_saldo m
JOIN parqueo.credito_recarga c USING (id_movimiento)
JOIN parqueo.recarga r USING (id_recarga)
WHERE r.estado = 'CONFIRMADA'
UNION ALL
SELECT m.id_movimiento, s.id_billetera, m.fecha_hora, m.concepto,
       'DEBITO', -e.importe_aplicado
FROM parqueo.movimiento_saldo m
JOIN parqueo.pago_saldo s USING (id_movimiento)
JOIN parqueo.pago p USING (id_pago)
JOIN parqueo.estacionamiento e USING (id_estacionamiento)
UNION ALL
SELECT m.id_movimiento, a.id_billetera, m.fecha_hora, m.concepto,
       'AJUSTE', a.importe_con_signo
FROM parqueo.movimiento_saldo m
JOIN parqueo.ajuste_saldo a USING (id_movimiento);

CREATE VIEW parqueo.v_saldo_billetera AS
SELECT b.id_billetera, b.id_conductor, b.estado, COALESCE(sum(a.importe), 0) AS saldo
FROM parqueo.billetera b
LEFT JOIN parqueo.v_asientos_saldo a USING (id_billetera)
GROUP BY b.id_billetera, b.id_conductor, b.estado;

CREATE VIEW parqueo.v_disponibilidad_cuadra AS
SELECT c.id_cuadra, c.id_sector, c.capacidad, count(e.id_estacionamiento) AS ocupados,
       c.capacidad - count(e.id_estacionamiento) AS disponibles
FROM parqueo.cuadra c
LEFT JOIN parqueo.tarifa t USING (id_cuadra)
LEFT JOIN parqueo.estacionamiento e
    ON e.id_tarifa = t.id_tarifa
    AND NOT EXISTS (
        SELECT 1 FROM parqueo.cierre_estadia s
        WHERE s.id_estacionamiento = e.id_estacionamiento
    )
GROUP BY c.id_cuadra, c.id_sector, c.capacidad;

-- Las reglas entre subtipos se evalúan al finalizar la transacción.
-- Insertar pago+método+comprobante en una sola transacción.
-- Confirmar recarga+movimiento+crédito+comprobante en una sola transacción.
CREATE FUNCTION parqueo.validar_pago() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = parqueo, pg_catalog AS $$
DECLARE
    clave BIGINT;
BEGIN
    IF TG_OP = 'DELETE' THEN clave := OLD.id_pago;
    ELSE clave := NEW.id_pago;
    END IF;
    PERFORM 1 FROM pago WHERE id_pago = clave FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF (SELECT count(*) FROM (
        SELECT id_pago FROM pago_saldo WHERE id_pago = clave
        UNION ALL SELECT id_pago FROM pago_efectivo WHERE id_pago = clave
    ) metodos) <> 1 THEN
        RAISE EXCEPTION 'El pago % debe tener exactamente un método', clave;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM comprobante WHERE id_pago = clave) THEN
        RAISE EXCEPTION 'El pago % necesita comprobante', clave;
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER validar_pago_base
AFTER INSERT OR UPDATE ON pago DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_pago();
CREATE CONSTRAINT TRIGGER validar_pago_saldo
AFTER INSERT OR UPDATE OR DELETE ON pago_saldo DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_pago();
CREATE CONSTRAINT TRIGGER validar_pago_efectivo
AFTER INSERT OR UPDATE OR DELETE ON pago_efectivo DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_pago();

CREATE FUNCTION parqueo.validar_movimiento() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = parqueo, pg_catalog AS $$
DECLARE
    clave BIGINT;
BEGIN
    IF TG_OP = 'DELETE' THEN clave := OLD.id_movimiento;
    ELSE clave := NEW.id_movimiento;
    END IF;
    PERFORM 1 FROM movimiento_saldo WHERE id_movimiento = clave FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF (SELECT count(*) FROM (
        SELECT id_movimiento FROM credito_recarga WHERE id_movimiento = clave
        UNION ALL SELECT id_movimiento FROM pago_saldo WHERE id_movimiento = clave
        UNION ALL SELECT id_movimiento FROM ajuste_saldo WHERE id_movimiento = clave
    ) origenes) <> 1 THEN
        RAISE EXCEPTION 'El movimiento % debe tener exactamente un origen', clave;
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER validar_movimiento_base
AFTER INSERT OR UPDATE ON movimiento_saldo DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_movimiento();
CREATE CONSTRAINT TRIGGER validar_movimiento_credito
AFTER INSERT OR UPDATE OR DELETE ON credito_recarga DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_movimiento();
CREATE CONSTRAINT TRIGGER validar_movimiento_debito
AFTER INSERT OR UPDATE OR DELETE ON pago_saldo DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_movimiento();
CREATE CONSTRAINT TRIGGER validar_movimiento_ajuste
AFTER INSERT OR UPDATE OR DELETE ON ajuste_saldo DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_movimiento();

CREATE FUNCTION parqueo.validar_recarga() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = parqueo, pg_catalog AS $$
DECLARE
    clave BIGINT;
    situacion TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN clave := OLD.id_recarga;
    ELSE clave := NEW.id_recarga;
    END IF;
    SELECT estado INTO situacion FROM recarga WHERE id_recarga = clave FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF (situacion = 'CONFIRMADA') <> EXISTS (
        SELECT 1 FROM credito_recarga WHERE id_recarga = clave
    ) THEN
        RAISE EXCEPTION 'La recarga % requiere crédito si y solo si está confirmada', clave;
    END IF;
    IF (situacion = 'CONFIRMADA') <> EXISTS (
        SELECT 1 FROM comprobante WHERE id_recarga = clave
    ) THEN
        RAISE EXCEPTION 'La recarga % requiere comprobante si y solo si está confirmada', clave;
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER validar_recarga_base
AFTER INSERT OR UPDATE ON recarga DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_recarga();
CREATE CONSTRAINT TRIGGER validar_recarga_credito
AFTER INSERT OR UPDATE OR DELETE ON credito_recarga DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_recarga();

-- Toda modificación de comprobante revisa su operación de origen.
CREATE CONSTRAINT TRIGGER validar_comprobante_pago
AFTER INSERT OR UPDATE OR DELETE ON comprobante DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_pago();
CREATE CONSTRAINT TRIGGER validar_comprobante_recarga
AFTER INSERT OR UPDATE OR DELETE ON comprobante DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validar_recarga();

-- Las claves y las referencias de asientos y comprobantes se mantienen estables.
-- Esto también impide dejar padres sin validar al trasladar un subtipo.
CREATE FUNCTION parqueo.impedir_cambio_claves() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    columna TEXT;
BEGIN
    FOREACH columna IN ARRAY TG_ARGV LOOP
        IF (to_jsonb(NEW) -> columna) IS DISTINCT FROM (to_jsonb(OLD) -> columna) THEN
            RAISE EXCEPTION 'La columna %.% es inmutable', TG_TABLE_NAME, columna;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;
CREATE TRIGGER claves_pago BEFORE UPDATE ON pago FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_pago', 'id_estacionamiento');
CREATE TRIGGER claves_pago_saldo BEFORE UPDATE ON pago_saldo FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_pago', 'id_movimiento', 'id_billetera');
CREATE TRIGGER claves_pago_efectivo BEFORE UPDATE ON pago_efectivo FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_pago');
CREATE TRIGGER claves_credito BEFORE UPDATE ON credito_recarga FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_movimiento', 'id_recarga');
CREATE TRIGGER claves_ajuste BEFORE UPDATE ON ajuste_saldo FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_movimiento', 'id_billetera');
CREATE TRIGGER claves_comprobante BEFORE UPDATE ON comprobante FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_comprobante', 'id_pago', 'id_recarga');
CREATE TRIGGER claves_movimiento BEFORE UPDATE ON movimiento_saldo FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_movimiento');
CREATE TRIGGER claves_recarga BEFORE UPDATE ON recarga FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_recarga', 'id_billetera', 'monto');
CREATE TRIGGER importe_historico BEFORE UPDATE ON estacionamiento FOR EACH ROW
EXECUTE FUNCTION impedir_cambio_claves('id_estacionamiento', 'id_tarifa', 'importe_aplicado');

-- Responsabilidades transaccionales de la aplicación:
-- 1. Bloquear la fila de billetera con SELECT ... FOR UPDATE antes de consultar
--    el saldo y registrar cualquier crédito, débito o ajuste. Confirmar en READ COMMITTED.
--    Comprobar saldo suficiente y estado ACTIVA antes de pagar.
-- 2. Bloquear la cuadra y el vehículo antes de registrar entrada/salida.
--    Verificar capacidad, ausencia de otra estadía abierta y vigencia de tarifa.
--    Al cerrar, validar fecha_hora_salida >= fecha_hora_entrada.
-- 3. Evitar intervalos de tarifa/asignación superpuestos y conservar las versiones históricas.
-- 4. Registrar auditoría, controlar destinatarios de avisos e impedir duplicación
--    de operaciones externas mediante una clave de idempotencia en la integración.
-- 5. Crear conductor y billetera juntos. Revertir errores mediante operaciones auditadas.
-- Estas reglas requieren coordinación entre operaciones, además de las FK y CHECK.
COMMIT;
