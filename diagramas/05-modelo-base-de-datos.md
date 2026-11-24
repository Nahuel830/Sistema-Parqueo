# Modelo de la base de datos (PostgreSQL)

## Diagrama entidad-relación

Generado a partir de `AVANCE TRÍO B/backend/db/schema.sql`. Solo se muestran las columnas principales.

```mermaid
erDiagram
  SECTOR ||--o{ LUGAR : "tiene"
  SECTOR ||--o{ TARIFA : "define"
  SECTOR |o--o{ USUARIO : "se asigna a encargados"
  LUGAR ||--o{ RESERVA : "recibe"
  TARIFA ||--o{ RESERVA : "fija el monto"
  RESERVA ||--o| CANCELACION : "puede terminar en"
  RESERVA ||--o{ PAGO : "se paga con"
  RESERVA ||--o| FICHA : "genera"
  PAGO ||--o| FICHA : "respalda"
  USUARIO |o--o{ PAGO : "cobra efectivo"
  USUARIO |o--o{ FICHA : "verifica"
  FICHA ||--o{ NOTIFICACION : "avisa por"
  USUARIO ||--o{ NOTIFICACION : "recibe"
  USUARIO |o--o{ BITACORA : "es responsable de"

  SECTOR {
    int id_sector PK
    string nombre
    int total_lugares
    boolean activo
  }
  LUGAR {
    int id_lugar PK
    int id_sector FK
    int numero
    string estado "LIBRE, RESERVADO u OCUPADO"
  }
  TARIFA {
    int id_tarifa PK
    int id_sector FK
    decimal monto
    timestamptz vigente_desde
    timestamptz vigente_hasta
    boolean activo
  }
  USUARIO {
    int id_usuario PK
    int id_sector FK
    string username
    string password_hash
    string rol "ENCARGADO o ADMIN"
    boolean activo
  }
  RESERVA {
    int id_reserva PK
    int id_lugar FK
    int id_tarifa FK
    string placa
    decimal monto
    timestamptz fecha_inicio
    timestamptz fecha_expiracion
    string estado "ACTIVA, PAGADA, CANCELADA o EXPIRADA"
  }
  CANCELACION {
    int id_cancelacion PK
    int id_reserva FK
    string tipo "CONDUCTOR o EXPIRACION"
    int segundos_transcurridos
  }
  PAGO {
    int id_pago PK
    int id_reserva FK
    int id_encargado FK
    string metodo "QR o EFECTIVO"
    decimal monto
    string estado "PENDIENTE, CONFIRMADO o RECHAZADO"
  }
  FICHA {
    int id_ficha PK
    int id_reserva FK
    int id_pago FK
    int id_encargado_verifica FK
    string codigo_unico
    string estado "EMITIDA, VERIFICADA, PAGADA o ANULADA"
  }
  NOTIFICACION {
    int id_notificacion PK
    int id_ficha FK
    int id_encargado FK
    boolean leida
  }
  BITACORA {
    int id_bitacora PK
    int id_usuario FK
    string entidad
    int id_entidad
    string accion
    timestamptz fecha_hora
  }
```

## Reglas que garantiza la base de datos
- Un lugar no puede tener dos reservas activas a la vez (índice único parcial `uk_reserva_lugar_activa`).
- Una reserva tiene como máximo una cancelación y una ficha, y el código de la ficha es único.
- Un encargado siempre pertenece a un sector (`chk_usuario_encargado_sector`).
- Los estados y métodos solo admiten los valores indicados (restricciones `CHECK`).

## Modelos entregados por el Trío A
| Modelo | Archivo |
|---|---|
| Conceptual | [`base-de-datos/diagrama-conceptual.svg`](base-de-datos/diagrama-conceptual.svg) |
| Lógico | [`base-de-datos/modelo-logico.svg`](base-de-datos/modelo-logico.svg) |
| Físico (script SQL) | [`base-de-datos/modelo-fisico-postgresql.sql`](base-de-datos/modelo-fisico-postgresql.sql) |

![Modelo conceptual](base-de-datos/diagrama-conceptual.svg)

![Modelo lógico](base-de-datos/modelo-logico.svg)
