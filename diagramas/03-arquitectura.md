# Arquitectura del sistema

Los diagramas usan Mermaid y GitHub los dibuja al abrir el archivo.

## Vista general

```mermaid
flowchart LR
  C([Conductor<br/>sin login])
  E([Encargado de sector])
  A([Administrador])
  B([Banco / pasarela QR<br/>simulada])

  subgraph FRONT[Frontend - React + Vite]
    FP[Vista pública:<br/>sectores, plano, reserva,<br/>pago y ficha]
    FE[Panel del encargado:<br/>fichas, cobro en efectivo,<br/>verificación y salidas]
    FA[Panel del administrador:<br/>cancelaciones, bitácora,<br/>sectores y lugares, reportes]
  end

  subgraph API[API REST - Node.js + Express]
    R[Rutas y controladores]
    M[Middlewares:<br/>JWT, roles, límite de login,<br/>errores]
    S[Servicios:<br/>reservas, pagos,<br/>encargado, administrador]
    T[Temporizador:<br/>barrido cada 5 s<br/>de reservas vencidas]
  end

  DB[(PostgreSQL<br/>sector, lugar, tarifa, usuario,<br/>reserva, cancelacion, pago,<br/>ficha, notificacion, bitacora)]

  C --> FP
  E --> FE
  A --> FA
  FP -- "/api (x-reserva-token)" --> R
  FE -- "/api (JWT)" --> R
  FA -- "/api (JWT)" --> R
  B -- "POST /api/pagos/qr/confirmar<br/>(x-pasarela-secret)" --> R
  R --> M --> S
  T --> S
  S --> DB
```

## Capas del backend

```mermaid
flowchart TD
  P[Petición HTTP] --> RT[routes: define la ruta y los permisos]
  RT --> MW[middlewares: autenticar y exigirRol]
  MW --> CT[controllers: leen la petición y arman la respuesta]
  CT --> SV[services: reglas de negocio y transacciones]
  SV --> PG[(PostgreSQL)]
  SV -. errores con código HTTP .-> ER[middleware de errores:<br/>respuesta en español]
```

## Seguridad
- **Conductor:** no tiene cuenta. Cada reserva trae un `tokenReserva` firmado (HMAC) que se envía en el header `x-reserva-token`.
- **Encargado y administrador:** inician sesión con usuario y contraseña (bcrypt) y reciben un JWT (`Authorization: Bearer`). Cada petición comprueba que el usuario siga activo.
- **Banco:** la confirmación del pago QR exige un secreto compartido (`x-pasarela-secret`).
- **Datos:** todas las consultas SQL son parametrizadas; la hora es la de Bolivia (UTC−4).
