# Diagramas de flujo – Sistema de Parqueo Tarija

Los diagramas usan Mermaid y se ven directamente en GitHub.

## 1. Reserva de un lugar

```mermaid
flowchart TD
  A([Conductor entra al sistema]) --> B[Elige un sector]
  B --> C[Ve los 20 lugares con su estado]
  C --> D{¿El lugar está libre?}
  D -- No --> C
  D -- Sí --> E[Selecciona el lugar]
  E --> F{¿Sigue libre al confirmar?}
  F -- No --> G[Mensaje: lugar no disponible] --> C
  F -- Sí --> H[Reserva por 5 minutos<br/>lugar = RESERVADO]
  H --> I[Muestra contador y monto]
  I --> J([Elegir forma de pago])
```

## 2. Pago por QR

```mermaid
flowchart TD
  A([Reserva activa]) --> B[Conductor elige QR]
  B --> C[Sistema genera el código QR<br/>pago = PENDIENTE]
  C --> D[Conductor paga desde su banco]
  D --> E{¿La pasarela confirma<br/>dentro de los 5 min?}
  E -- No --> F[Pago no aplicado<br/>la reserva expira] --> Z([Lugar LIBRE])
  E -- Sí --> G[pago = CONFIRMADO<br/>reserva = PAGADA<br/>lugar = OCUPADO]
  G --> H[Se emite la ficha con código único]
  H --> I[Notificación al encargado del sector]
  I --> J([Conductor muestra la ficha])
```

## 3. Pago en efectivo

```mermaid
flowchart TD
  A([Reserva activa]) --> B[Conductor elige efectivo]
  B --> C[pago = PENDIENTE<br/>se emite la ficha]
  C --> D[Notificación al encargado]
  D --> E[Conductor llega al lugar y muestra la ficha]
  E --> F{¿Llegó dentro de los 5 min?}
  F -- No --> G[Reserva expira<br/>ficha ANULADA<br/>pago RECHAZADO] --> Z([Lugar LIBRE])
  F -- Sí --> H[Encargado verifica la ficha]
  H --> I[Cobra en efectivo y lo registra]
  I --> J[Marca el sitio como pagado] --> K([Lugar OCUPADO])
```

## 4. Cancelación por el conductor

```mermaid
flowchart TD
  A([Reserva activa]) --> B[Conductor pulsa Cancelar]
  B --> C{¿Dentro de los 5 minutos<br/>y sin pagar?}
  C -- No --> D[Mensaje: no se puede cancelar] --> Z([Fin])
  C -- Sí --> E[reserva = CANCELADA<br/>lugar = LIBRE]
  E --> F[Anula ficha y rechaza pago pendiente]
  F --> G[Registra cancelación y bitácora] --> Z
```

## 5. Expiración automática

```mermaid
flowchart TD
  A([Cada 5 segundos]) --> B[Busca reservas ACTIVAS vencidas]
  B --> C{¿Hay alguna?}
  C -- No --> A
  C -- Sí --> D[reserva = EXPIRADA<br/>lugar = LIBRE]
  D --> E[Anula ficha y rechaza pago pendiente]
  E --> F[Registra cancelación por expiración y bitácora]
  F --> A
```

## 6. Secuencia del pago por QR

```mermaid
sequenceDiagram
  actor C as Conductor
  participant API as API (Express)
  participant BD as PostgreSQL
  participant B as Pasarela / banco
  actor E as Encargado

  C->>API: POST /api/reservas (idLugar)
  API->>BD: reserva 5 min + lugar RESERVADO
  API-->>C: reserva + tokenReserva
  C->>API: POST /api/reservas/:id/pago (QR)
  API->>BD: pago PENDIENTE
  API-->>C: código QR
  C->>B: paga desde su banco
  B->>API: POST /api/pagos/qr/confirmar
  API->>BD: pago CONFIRMADO, reserva PAGADA, ficha, notificación
  API-->>E: nueva ficha
  C->>API: GET /api/reservas/:id/ficha
  API-->>C: ficha electrónica
```
