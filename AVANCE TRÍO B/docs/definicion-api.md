# Definición de la API – Sistema de Parqueo Tarija

- **Estilo:** REST + JSON. Prefijo `/api`. Respuestas en español con el formato `{ "ok": true|false, "mensaje": "...", "datos": ... }`.
- **Stack:** Node.js + Express, PostgreSQL, JWT + bcrypt.
- **Conductor sin login:** la reserva se identifica con un `tokenReserva` que viaja en el header `x-reserva-token`.
- **Encargado y administrador:** login con JWT (`Authorization: Bearer <token>`). Respuestas 401 si falta o vence la sesión y 403 si el rol no corresponde.
- **Tiempos:** los 5 minutos se calculan en el servidor. Zona horaria de Bolivia (UTC−4); moneda en bolivianos.

## Códigos de respuesta

| Código | Significado |
|---|---|
| 200 / 201 | Operación correcta / recurso creado |
| 400 | Datos inválidos |
| 401 | Falta iniciar sesión o la sesión venció |
| 403 | Token de reserva inválido o rol sin permiso |
| 429 | Demasiados intentos de inicio de sesión |
| 404 | Recurso no encontrado |
| 409 | Conflicto (lugar no disponible, reserva ya pagada) |
| 410 | La reserva expiró |
| 503 | Base de datos no disponible |

## Endpoints implementados

| Método | Ruta | Descripción | Req. | Día |
|---|---|---|---|---|
| GET | `/api/estado` | Estado de la API | – | 17 |
| GET | `/api/estado/bd` | Conexión a PostgreSQL | – | 17 |
| GET | `/api/sectores` | Lista de sectores con lugares libres | RF-02 | 18 |
| GET | `/api/sectores/:id/lugares` | Lugares del sector con su estado | RF-03 | 18 |
| POST | `/api/reservas` | Reserva un lugar 5 minutos | RF-05, RF-06 | 19 |
| GET | `/api/reservas/:id` | Consulta la reserva | RF-07 | 19 |
| POST | `/api/reservas/:id/cancelar` | Cancela dentro de los 5 minutos | RF-13 | 19 |
| POST | `/api/reservas/:id/pago` | Elige QR o efectivo | RF-08 a RF-10 | 20 |
| POST | `/api/pagos/qr/confirmar` | Confirmación de la pasarela | RF-11, RF-39 | 20 |
| GET | `/api/reservas/:id/ficha` | Ficha electrónica | RF-12, RF-15 | 20 |

## Endpoints del login y del encargado (día 21)

| Método | Ruta | Descripción | Req. | Día |
|---|---|---|---|---|
| POST | `/api/auth/login` | Login de encargado y administrador (JWT) | RF-16, RF-26 | 21 |
| GET | `/api/auth/yo` | Datos de la sesión | – | 21 |
| GET | `/api/encargado/lugares` | Lugares de su sector | RF-17, RF-18 | 21 |
| GET | `/api/encargado/fichas` | Fichas de su sector (filtros estado y fecha) | RF-24, RF-25 | 21 |
| GET | `/api/encargado/fichas/:codigo` | Detalle de la ficha | RF-20 | 21 |
| POST | `/api/encargado/fichas/:codigo/cobrar` | Registra el cobro en efectivo | RF-22 | 21 |
| POST | `/api/encargado/fichas/:codigo/verificar` | Verifica la ficha | RF-21 | 21 |
| POST | `/api/encargado/fichas/:codigo/pagada` | Marca la ficha como pagada | RF-21 | 21 |
| GET | `/api/encargado/notificaciones` | Fichas nuevas | RF-19, RF-23 | 21 |
| POST | `/api/encargado/notificaciones/:id/leida` | Marca una notificación como leída | RF-23 | 21 |

## Endpoints del administrador (día 22)

| Método | Ruta | Descripción | Req. | Día |
|---|---|---|---|---|
| GET | `/api/admin/lugares` | Estado de los 40 lugares | RF-35 | 22 |
| GET | `/api/admin/cancelaciones` | Cancelaciones y expiraciones, con filtros | RF-31, RF-32 | 22 |
| GET | `/api/admin/pagos` | Pagos y fichas, con filtros | RF-33 | 22 |
| GET | `/api/admin/reportes/resumen` | Ingresos, ocupación y cancelaciones | RF-34 | 22 |
| GET | `/api/admin/tarifas` | Tarifas vigentes | RF-28 | 22 |
| PUT | `/api/admin/tarifas/:idSector` | Cambia la tarifa de un sector | RF-28 | 22 |
| GET | `/api/admin/encargados` | Lista de encargados | RF-29 | 22 |
| POST | `/api/admin/encargados` | Crea un encargado y lo asigna a un sector | RF-29, RF-30 | 22 |
| PATCH | `/api/admin/encargados/:id` | Edita, cambia de sector o desactiva | RF-29, RF-30 | 22 |
| POST | `/api/admin/encargados/:id/password` | Restablece la contraseña | RF-29 | 22 |

Pendiente: exportar reportes a PDF o Excel (RF-34) y gestionar sectores y lugares (RF-27).

## Estructura del backend

```
backend/
├── db/schema.sql         # tablas PostgreSQL y datos iniciales
├── postman/              # colección de pruebas
├── src/
│   ├── config/           # variables de entorno y pool de PostgreSQL
│   ├── controllers/      # reciben la petición y responden
│   ├── middlewares/      # errores y 404
│   ├── models/           # consultas SQL
│   ├── routes/           # rutas REST
│   ├── services/         # reglas de negocio (reservas y pagos)
│   └── utils/            # fechas y seguridad
└── tests/
```
