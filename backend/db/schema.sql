SET NAMES utf8mb4;
SET time_zone = '-04:00';

CREATE DATABASE IF NOT EXISTS parqueo_tarija
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE parqueo_tarija;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS NOTIFICACION;
DROP TABLE IF EXISTS BITACORA;
DROP TABLE IF EXISTS FICHA;
DROP TABLE IF EXISTS PAGO;
DROP TABLE IF EXISTS CANCELACION;
DROP TABLE IF EXISTS RESERVA;
DROP TABLE IF EXISTS USUARIO;
DROP TABLE IF EXISTS TARIFA;
DROP TABLE IF EXISTS LUGAR;
DROP TABLE IF EXISTS SECTOR;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE SECTOR (
  id_sector INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(200) NULL,
  total_lugares INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_sector),
  UNIQUE KEY uk_sector_nombre (nombre),
  CONSTRAINT chk_sector_total_lugares CHECK (total_lugares >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE LUGAR (
  id_lugar INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sector INT UNSIGNED NOT NULL,
  numero INT NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'LIBRE',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_lugar),
  UNIQUE KEY uk_lugar_sector_numero (id_sector, numero),
  CONSTRAINT chk_lugar_numero CHECK (numero > 0),
  CONSTRAINT chk_lugar_estado CHECK (estado IN ('LIBRE', 'RESERVADO', 'OCUPADO')),
  CONSTRAINT fk_lugar_sector FOREIGN KEY (id_sector) REFERENCES SECTOR (id_sector) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE TARIFA (
  id_tarifa INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sector INT UNSIGNED NOT NULL,
  monto DECIMAL(8, 2) NOT NULL,
  vigente_desde DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vigente_hasta DATETIME NULL DEFAULT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_tarifa),
  KEY idx_tarifa_sector_activo (id_sector, activo),
  CONSTRAINT chk_tarifa_monto CHECK (monto > 0),
  CONSTRAINT fk_tarifa_sector FOREIGN KEY (id_sector) REFERENCES SECTOR (id_sector) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE USUARIO (
  id_usuario INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sector INT UNSIGNED NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  username VARCHAR(40) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(10) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uk_usuario_username (username),
  CONSTRAINT chk_usuario_rol CHECK (rol IN ('ENCARGADO', 'ADMIN')),
  CONSTRAINT chk_usuario_encargado_sector CHECK (rol <> 'ENCARGADO' OR id_sector IS NOT NULL),
  CONSTRAINT fk_usuario_sector FOREIGN KEY (id_sector) REFERENCES SECTOR (id_sector) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE RESERVA (
  id_reserva INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_lugar INT UNSIGNED NOT NULL,
  id_tarifa INT UNSIGNED NOT NULL,
  placa VARCHAR(15) NULL,
  monto DECIMAL(8, 2) NOT NULL,
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion DATETIME NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVA',
  fecha_cierre DATETIME NULL DEFAULT NULL,
  lugar_reservado INT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN estado = 'ACTIVA' THEN id_lugar ELSE NULL END
  ) STORED,
  PRIMARY KEY (id_reserva),
  UNIQUE KEY uk_reserva_lugar_activa (lugar_reservado),
  KEY idx_reserva_estado_expiracion (estado, fecha_expiracion),
  CONSTRAINT chk_reserva_monto CHECK (monto > 0),
  CONSTRAINT chk_reserva_estado CHECK (estado IN ('ACTIVA', 'PAGADA', 'CANCELADA', 'EXPIRADA')),
  CONSTRAINT fk_reserva_lugar FOREIGN KEY (id_lugar) REFERENCES LUGAR (id_lugar) ON DELETE RESTRICT,
  CONSTRAINT fk_reserva_tarifa FOREIGN KEY (id_tarifa) REFERENCES TARIFA (id_tarifa) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE CANCELACION (
  id_cancelacion INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_reserva INT UNSIGNED NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  motivo VARCHAR(200) NULL,
  fecha_cancelacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  segundos_transcurridos INT NOT NULL,
  PRIMARY KEY (id_cancelacion),
  UNIQUE KEY uk_cancelacion_reserva (id_reserva),
  KEY idx_cancelacion_tipo_fecha (tipo, fecha_cancelacion),
  CONSTRAINT chk_cancelacion_tipo CHECK (tipo IN ('CONDUCTOR', 'EXPIRACION')),
  CONSTRAINT chk_cancelacion_segundos CHECK (segundos_transcurridos >= 0),
  CONSTRAINT fk_cancelacion_reserva FOREIGN KEY (id_reserva) REFERENCES RESERVA (id_reserva) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE PAGO (
  id_pago INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_reserva INT UNSIGNED NOT NULL,
  id_encargado INT UNSIGNED NULL,
  metodo VARCHAR(8) NOT NULL,
  monto DECIMAL(8, 2) NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE',
  codigo_qr VARCHAR(255) NULL,
  referencia_pasarela VARCHAR(100) NULL,
  fecha_pago DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id_pago),
  KEY idx_pago_reserva (id_reserva),
  KEY idx_pago_metodo_fecha (metodo, fecha_pago),
  CONSTRAINT chk_pago_metodo CHECK (metodo IN ('QR', 'EFECTIVO')),
  CONSTRAINT chk_pago_monto CHECK (monto > 0),
  CONSTRAINT chk_pago_estado CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO')),
  CONSTRAINT fk_pago_reserva FOREIGN KEY (id_reserva) REFERENCES RESERVA (id_reserva) ON DELETE RESTRICT,
  CONSTRAINT fk_pago_encargado FOREIGN KEY (id_encargado) REFERENCES USUARIO (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE FICHA (
  id_ficha INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_reserva INT UNSIGNED NOT NULL,
  id_pago INT UNSIGNED NOT NULL,
  id_encargado_verifica INT UNSIGNED NULL,
  codigo_unico VARCHAR(30) NOT NULL,
  fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(10) NOT NULL DEFAULT 'EMITIDA',
  fecha_verificacion DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id_ficha),
  UNIQUE KEY uk_ficha_reserva (id_reserva),
  UNIQUE KEY uk_ficha_pago (id_pago),
  UNIQUE KEY uk_ficha_codigo (codigo_unico),
  KEY idx_ficha_estado_fecha (estado, fecha_emision),
  CONSTRAINT chk_ficha_estado CHECK (estado IN ('EMITIDA', 'VERIFICADA', 'PAGADA', 'ANULADA')),
  CONSTRAINT fk_ficha_reserva FOREIGN KEY (id_reserva) REFERENCES RESERVA (id_reserva) ON DELETE RESTRICT,
  CONSTRAINT fk_ficha_pago FOREIGN KEY (id_pago) REFERENCES PAGO (id_pago) ON DELETE RESTRICT,
  CONSTRAINT fk_ficha_encargado FOREIGN KEY (id_encargado_verifica) REFERENCES USUARIO (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE BITACORA (
  id_bitacora INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario INT UNSIGNED NULL,
  entidad VARCHAR(30) NOT NULL,
  id_entidad INT NOT NULL,
  accion VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(30) NULL,
  estado_nuevo VARCHAR(30) NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_bitacora),
  KEY idx_bitacora_entidad (entidad, id_entidad),
  KEY idx_bitacora_fecha (fecha_hora),
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE NOTIFICACION (
  id_notificacion INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_ficha INT UNSIGNED NOT NULL,
  id_encargado INT UNSIGNED NOT NULL,
  fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id_notificacion),
  KEY idx_notificacion_encargado_leida (id_encargado, leida),
  CONSTRAINT fk_notificacion_ficha FOREIGN KEY (id_ficha) REFERENCES FICHA (id_ficha) ON DELETE RESTRICT,
  CONSTRAINT fk_notificacion_encargado FOREIGN KEY (id_encargado) REFERENCES USUARIO (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO SECTOR (id_sector, nombre, descripcion, total_lugares, activo) VALUES
  (1, 'Plaza Sucre', 'Sector de parqueo tarifado de la Plaza Sucre', 20, 1),
  (2, 'Palacio de Justicia', 'Sector de parqueo tarifado del Palacio de Justicia', 20, 1);

INSERT INTO LUGAR (id_sector, numero, estado, activo) VALUES
  (1, 1, 'LIBRE', 1), (1, 2, 'LIBRE', 1), (1, 3, 'LIBRE', 1), (1, 4, 'LIBRE', 1),
  (1, 5, 'LIBRE', 1), (1, 6, 'LIBRE', 1), (1, 7, 'LIBRE', 1), (1, 8, 'LIBRE', 1),
  (1, 9, 'LIBRE', 1), (1, 10, 'LIBRE', 1), (1, 11, 'LIBRE', 1), (1, 12, 'LIBRE', 1),
  (1, 13, 'LIBRE', 1), (1, 14, 'LIBRE', 1), (1, 15, 'LIBRE', 1), (1, 16, 'LIBRE', 1),
  (1, 17, 'LIBRE', 1), (1, 18, 'LIBRE', 1), (1, 19, 'LIBRE', 1), (1, 20, 'LIBRE', 1),
  (2, 1, 'LIBRE', 1), (2, 2, 'LIBRE', 1), (2, 3, 'LIBRE', 1), (2, 4, 'LIBRE', 1),
  (2, 5, 'LIBRE', 1), (2, 6, 'LIBRE', 1), (2, 7, 'LIBRE', 1), (2, 8, 'LIBRE', 1),
  (2, 9, 'LIBRE', 1), (2, 10, 'LIBRE', 1), (2, 11, 'LIBRE', 1), (2, 12, 'LIBRE', 1),
  (2, 13, 'LIBRE', 1), (2, 14, 'LIBRE', 1), (2, 15, 'LIBRE', 1), (2, 16, 'LIBRE', 1),
  (2, 17, 'LIBRE', 1), (2, 18, 'LIBRE', 1), (2, 19, 'LIBRE', 1), (2, 20, 'LIBRE', 1);
