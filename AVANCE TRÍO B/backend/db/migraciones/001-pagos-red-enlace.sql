BEGIN;
ALTER TABLE pago ALTER COLUMN codigo_qr TYPE TEXT;
ALTER TABLE pago ADD COLUMN IF NOT EXISTS proveedor_qr VARCHAR(15);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pago_qr_redenlace
  ON pago (referencia_pasarela) WHERE proveedor_qr = 'RED_ENLACE';
COMMIT;
