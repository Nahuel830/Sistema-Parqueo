-- Instalación inicial, en una base vacía. Contrato del Trío B (5811729).
-- Los dos sectores y sus 40 lugares se crean al final de la transacción.
BEGIN;

SET LOCAL TIME ZONE 'America/La_Paz';

CREATE TABLE sector (
  id_sector SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(200),
  total_lugares INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uk_sector_nombre UNIQUE (nombre),
  CONSTRAINT chk_sector_total_lugares CHECK (total_lugares >= 0)
);

CREATE TABLE lugar (
  id_lugar SERIAL PRIMARY KEY,
  id_sector INT NOT NULL,
  numero INT NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'LIBRE',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uk_lugar_sector_numero UNIQUE (id_sector, numero),
  CONSTRAINT chk_lugar_numero CHECK (numero > 0),
  CONSTRAINT chk_lugar_estado CHECK (estado IN ('LIBRE', 'RESERVADO', 'OCUPADO')),
  CONSTRAINT fk_lugar_sector FOREIGN KEY (id_sector) REFERENCES sector (id_sector) ON DELETE RESTRICT
);

CREATE TABLE tarifa (
  id_tarifa SERIAL PRIMARY KEY,
  id_sector INT NOT NULL,
  monto NUMERIC(8, 2) NOT NULL,
  vigente_desde TIMESTAMPTZ NOT NULL DEFAULT now(),
  vigente_hasta TIMESTAMPTZ,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_tarifa_monto CHECK (monto > 0),
  CONSTRAINT fk_tarifa_sector FOREIGN KEY (id_sector) REFERENCES sector (id_sector) ON DELETE RESTRICT
);

CREATE INDEX idx_tarifa_sector_activo ON tarifa (id_sector, activo);

CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  id_sector INT,
  nombre_completo VARCHAR(100) NOT NULL,
  username VARCHAR(40) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(10) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uk_usuario_username UNIQUE (username),
  CONSTRAINT chk_usuario_rol CHECK (rol IN ('ENCARGADO', 'ADMIN')),
  CONSTRAINT chk_usuario_encargado_sector CHECK (rol <> 'ENCARGADO' OR id_sector IS NOT NULL),
  CONSTRAINT fk_usuario_sector FOREIGN KEY (id_sector) REFERENCES sector (id_sector) ON DELETE RESTRICT
);

CREATE TABLE reserva (
  id_reserva SERIAL PRIMARY KEY,
  id_lugar INT NOT NULL,
  id_tarifa INT NOT NULL,
  placa VARCHAR(15),
  monto NUMERIC(8, 2) NOT NULL,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_expiracion TIMESTAMPTZ NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVA',
  fecha_cierre TIMESTAMPTZ,
  CONSTRAINT chk_reserva_monto CHECK (monto > 0),
  CONSTRAINT chk_reserva_estado CHECK (estado IN ('ACTIVA', 'PAGADA', 'CANCELADA', 'EXPIRADA')),
  CONSTRAINT fk_reserva_lugar FOREIGN KEY (id_lugar) REFERENCES lugar (id_lugar) ON DELETE RESTRICT,
  CONSTRAINT fk_reserva_tarifa FOREIGN KEY (id_tarifa) REFERENCES tarifa (id_tarifa) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uk_reserva_lugar_activa ON reserva (id_lugar) WHERE estado = 'ACTIVA';
CREATE INDEX idx_reserva_estado_expiracion ON reserva (estado, fecha_expiracion);

CREATE TABLE cancelacion (
  id_cancelacion SERIAL PRIMARY KEY,
  id_reserva INT NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  motivo VARCHAR(200),
  fecha_cancelacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  segundos_transcurridos INT NOT NULL,
  CONSTRAINT uk_cancelacion_reserva UNIQUE (id_reserva),
  CONSTRAINT chk_cancelacion_tipo CHECK (tipo IN ('CONDUCTOR', 'EXPIRACION')),
  CONSTRAINT chk_cancelacion_segundos CHECK (segundos_transcurridos >= 0),
  CONSTRAINT fk_cancelacion_reserva FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva) ON DELETE RESTRICT
);

CREATE INDEX idx_cancelacion_tipo_fecha ON cancelacion (tipo, fecha_cancelacion);

CREATE TABLE pago (
  id_pago SERIAL PRIMARY KEY,
  id_reserva INT NOT NULL,
  id_encargado INT,
  metodo VARCHAR(8) NOT NULL,
  monto NUMERIC(8, 2) NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE',
  codigo_qr VARCHAR(255),
  referencia_pasarela VARCHAR(100),
  fecha_pago TIMESTAMPTZ,
  CONSTRAINT chk_pago_metodo CHECK (metodo IN ('QR', 'EFECTIVO')),
  CONSTRAINT chk_pago_monto CHECK (monto > 0),
  CONSTRAINT chk_pago_estado CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO')),
  CONSTRAINT fk_pago_reserva FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva) ON DELETE RESTRICT,
  CONSTRAINT fk_pago_encargado FOREIGN KEY (id_encargado) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_pago_reserva ON pago (id_reserva);
CREATE INDEX idx_pago_metodo_fecha ON pago (metodo, fecha_pago);

CREATE TABLE ficha (
  id_ficha SERIAL PRIMARY KEY,
  id_reserva INT NOT NULL,
  id_pago INT NOT NULL,
  id_encargado_verifica INT,
  codigo_unico VARCHAR(30) NOT NULL,
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado VARCHAR(10) NOT NULL DEFAULT 'EMITIDA',
  fecha_verificacion TIMESTAMPTZ,
  CONSTRAINT uk_ficha_reserva UNIQUE (id_reserva),
  CONSTRAINT uk_ficha_pago UNIQUE (id_pago),
  CONSTRAINT uk_ficha_codigo UNIQUE (codigo_unico),
  CONSTRAINT chk_ficha_estado CHECK (estado IN ('EMITIDA', 'VERIFICADA', 'PAGADA', 'ANULADA')),
  CONSTRAINT fk_ficha_reserva FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva) ON DELETE RESTRICT,
  CONSTRAINT fk_ficha_pago FOREIGN KEY (id_pago) REFERENCES pago (id_pago) ON DELETE RESTRICT,
  CONSTRAINT fk_ficha_encargado FOREIGN KEY (id_encargado_verifica) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_ficha_estado_fecha ON ficha (estado, fecha_emision);

CREATE TABLE bitacora (
  id_bitacora SERIAL PRIMARY KEY,
  id_usuario INT,
  entidad VARCHAR(30) NOT NULL,
  id_entidad INT NOT NULL,
  accion VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(30),
  estado_nuevo VARCHAR(30) NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_bitacora_entidad ON bitacora (entidad, id_entidad);
CREATE INDEX idx_bitacora_fecha ON bitacora (fecha_hora);

CREATE TABLE notificacion (
  id_notificacion SERIAL PRIMARY KEY,
  id_ficha INT NOT NULL,
  id_encargado INT NOT NULL,
  fecha_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_notificacion_ficha FOREIGN KEY (id_ficha) REFERENCES ficha (id_ficha) ON DELETE RESTRICT,
  CONSTRAINT fk_notificacion_encargado FOREIGN KEY (id_encargado) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_notificacion_encargado_leida ON notificacion (id_encargado, leida);

INSERT INTO sector (id_sector, nombre, descripcion, total_lugares, activo) VALUES
  (1, 'Plaza Sucre', 'Sector de parqueo tarifado de la Plaza Sucre', 20, TRUE),
  (2, 'Palacio de Justicia', 'Sector de parqueo tarifado del Palacio de Justicia', 20, TRUE);

SELECT setval(pg_get_serial_sequence('sector', 'id_sector'), (SELECT MAX(id_sector) FROM sector));

INSERT INTO lugar (id_sector, numero, estado, activo)
SELECT s.id_sector, n.numero, 'LIBRE', TRUE
  FROM sector s
 CROSS JOIN generate_series(1, 20) AS n (numero)
 WHERE s.nombre IN ('Plaza Sucre', 'Palacio de Justicia')
 ORDER BY s.id_sector, n.numero;

SELECT setval(pg_get_serial_sequence('lugar', 'id_lugar'), (SELECT MAX(id_lugar) FROM lugar));

COMMIT;
