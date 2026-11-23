# Backend – Sistema de Parqueo de Tarija

API REST (JSON) del Sistema de Parqueo. Construida con **Node.js + Express**, **PostgreSQL** (administrado con pgAdmin), autenticación **JWT + bcrypt**. Todas las fechas se manejan en la zona horaria de Bolivia (`America/La_Paz`, UTC−4) y la moneda es el boliviano (Bs).

## Requisitos

- Node.js 18 o superior (probado con Node.js 24).
- npm 9 o superior.
- PostgreSQL 14 o superior (probado con PostgreSQL 17) y pgAdmin.
- El script de la base de datos está incluido en `db/schema.sql`.

## Instalación

```bash
cd backend
npm install
```

## Configuración

1. Copia el archivo de ejemplo y completa los valores:

   ```bash
   cp .env.example .env
   ```

   En Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Genera un `JWT_SECRET` de al menos 32 caracteres:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. Ajusta `DB_HOST`, `DB_PORT` (5432), `DB_USER` (por defecto `postgres`), `DB_PASSWORD` y `DB_NAME` según tu PostgreSQL local. Para una base local sin SSL deja `DB_SSL=false`.

> El archivo `.env` está en `.gitignore`. Nunca lo subas al repositorio.

## Base de datos

El script `db/schema.sql` crea las 10 tablas del sistema y carga los datos iniciales: los sectores **Plaza Sucre** y **Palacio de Justicia**, con **20 lugares cada uno** (40 en total).

El script **no crea la base de datos**. Primero crea la base `parqueo_tarija` desde pgAdmin:

1. Clic derecho en **Databases** → **Create** → **Database...**
2. Nombre: `parqueo_tarija`, propietario: `postgres`.
3. Guardar.

Luego ejecuta el script sobre esa base:

- **pgAdmin:** clic derecho en `parqueo_tarija` → **Query Tool**, abre `db/schema.sql` y ejecuta con **F5**.
- **psql (Windows):**

  ```powershell
  & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d parqueo_tarija -f db\schema.sql
  ```

- **psql (Linux/macOS):**

  ```bash
  psql -U postgres -d parqueo_tarija -f db/schema.sql
  ```

El script elimina y vuelve a crear las tablas: úsalo solo en desarrollo o cuando quieras reiniciar los datos. Asegúrate de que `DB_NAME` en `.env` coincida con `parqueo_tarija`.

> Las columnas de fecha usan `TIMESTAMPTZ` y se operan en hora de Bolivia (UTC−4). La reserva de 5 minutos se calcula en el servidor (PostgreSQL), nunca en el navegador.

## Ejecución

```bash
npm run dev    # desarrollo, reinicia al guardar cambios
npm start      # ejecución normal
```

La API queda disponible en `http://localhost:3000`.

## Endpoints actuales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/estado` | Estado de la API, entorno y hora de Bolivia. |
| GET | `/api/estado/bd` | Verifica la conexión con PostgreSQL (responde 503 si no está disponible). |
| GET | `/api/sectores` | Lista los sectores activos con total y cantidad de lugares libres. |
| GET | `/api/sectores/:id/lugares` | Devuelve el sector y sus lugares ordenados por número, con estado `LIBRE`, `RESERVADO` u `OCUPADO`. |
| POST | `/api/reservas` | Reserva un lugar por **5 minutos** (`{ "idLugar": 1, "placa": "1234ABC" }`). Devuelve la reserva y un `tokenReserva`. `409` si el lugar no está libre. |
| GET | `/api/reservas/:id` | Consulta la reserva (header `x-reserva-token`). Si ya venció la marca como `EXPIRADA` y libera el lugar. |
| POST | `/api/reservas/:id/cancelar` | Cancela dentro de los 5 minutos (header `x-reserva-token`) y libera el lugar. |
| POST | `/api/reservas/:id/pago` | El conductor elige el pago (`{ "metodo": "QR" }` o `"EFECTIVO"`, header `x-reserva-token`). QR devuelve `codigoQr` y `referencia`; efectivo emite la ficha. |
| GET | `/api/reservas/:id/ficha` | El conductor consulta su ficha electrónica (header `x-reserva-token`). |
| POST | `/api/pagos/qr/confirmar` | Confirmación del banco/pasarela (`{ "referencia": "..." }`, header `x-pasarela-secret`). Emite la ficha y marca el lugar `OCUPADO`. |
| POST | `/api/auth/login` | Inicia sesión (`{ "username": "...", "password": "..." }`). Devuelve un JWT para el header `Authorization: Bearer <token>`. |
| GET | `/api/auth/yo` | Datos del usuario con sesión iniciada. |
| GET | `/api/encargado/lugares` | Lugares de **su** sector con su estado (rol ENCARGADO). |
| GET | `/api/encargado/fichas` | Fichas de su sector. Hoy por defecto; filtros `?estado=` y `?fecha=AAAA-MM-DD` o `todas`. |
| GET | `/api/encargado/fichas/:codigo` | Detalle de una ficha para compararla con la del conductor. |
| POST | `/api/encargado/fichas/:codigo/cobrar` | Registra el cobro en efectivo; el lugar pasa a `OCUPADO`. |
| POST | `/api/encargado/fichas/:codigo/verificar` | Ficha `EMITIDA` → `VERIFICADA` (exige el pago confirmado). |
| POST | `/api/encargado/fichas/:codigo/pagada` | Ficha `VERIFICADA` → `PAGADA`. |
| GET | `/api/encargado/notificaciones` | Fichas nuevas (`?noLeidas=true`). `POST .../:id/leida` la marca como leída. |
| GET | `/api/admin/lugares` | Estado de los 40 lugares (rol ADMIN). |
| GET | `/api/admin/cancelaciones` | Cancelaciones y expiraciones. Filtros `desde`, `hasta`, `idSector`, `tipo`. |
| GET | `/api/admin/pagos` | Pagos y fichas. Filtros `desde`, `hasta`, `idSector`, `metodo`. |
| GET | `/api/admin/reportes/resumen` | Ingresos por sector y método, ocupación y cancelaciones por tipo. |
| GET / PUT | `/api/admin/tarifas`, `/api/admin/tarifas/:idSector` | Consulta y cambia la tarifa (`{ "monto": "4.50" }`). |
| GET / POST | `/api/admin/encargados` | Lista y crea encargados. `PATCH /:id` edita o desactiva; `POST /:id/password` restablece la contraseña. |

**Reservas (19 nov).** El conductor no tiene login: la reserva se identifica con un `tokenReserva` firmado (HMAC con `JWT_SECRET`) que se envía en el header `x-reserva-token`. Un barrido cada 5 segundos expira las reservas vencidas, libera el lugar y registra la cancelación por expiración y la bitácora. Reservar usa transacciones con bloqueo de fila, así que dos conductores no pueden tomar el mismo lugar.

Las respuestas usan el formato `{ "ok": true, "mensaje": "...", "datos": ... }`. Un sector inexistente responde `404`, un identificador inválido `400`, y si la base de datos no está disponible, `503`. Las rutas no existentes responden `404` con un mensaje en español y los errores internos responden `500` sin exponer detalles.

Las consultas usan sentencias parametrizadas de PostgreSQL (`$1`, `$2`) para prevenir inyección SQL.

**Pagos y fichas (20 nov).**
- **QR:** `POST /api/reservas/:id/pago` crea un pago `PENDIENTE` con `codigoQr` (el frontend lo dibuja como imagen). Cuando el banco confirma (`/api/pagos/qr/confirmar`), el pago pasa a `CONFIRMADO`, la reserva a `PAGADA`, el lugar a `OCUPADO` y se emite la **ficha** con código único (`PQ-XXXXXXXXXXXXXXXX`). La confirmación es idempotente y se rechaza si la reserva ya venció (RF-39).
- **Efectivo:** se emite la ficha al elegirlo; el pago queda `PENDIENTE` hasta que el encargado cobre (se agrega con el login, 21 nov). Si el conductor cancela o la reserva vence, la ficha se `ANULA` y el pago se `RECHAZA`.
- Al emitir una ficha se crea una **notificación** para los encargados activos del sector (RF-19, RF-23) y se registra todo en la **bitácora**.
- **Confirmación de la pasarela simulada:** no hay banco real conectado. La ruta `/api/pagos/qr/confirmar` está protegida con `PASARELA_SECRET` (mínimo 16 caracteres, en el `.env`); si no está definido responde 503.

**Login y panel del encargado (21 nov).**
- **Login:** JWT firmado con `JWT_SECRET` (HS256, vence según `JWT_EXPIRES_IN`) y contraseñas con **bcrypt**. Ante un usuario o contraseña incorrectos responde siempre el mismo mensaje. Después de 5 intentos fallidos seguidos (por IP y usuario) bloquea 15 minutos (429).
- **Cada petición** comprueba el token y que el usuario siga activo: si el administrador lo desactiva, pierde el acceso de inmediato.
- **Roles:** el panel del encargado exige el rol `ENCARGADO` y todas las consultas se limitan a **su sector**; una ficha de otro sector responde 404.
- **Efectivo:** `cobrar` → `verificar` → `pagada`. Verificar antes de cobrar responde 409, y cobrar una reserva vencida responde 410.
- **Crear los usuarios iniciales:** `npm run seed:usuarios` crea `admin` y un `encargado<N>` por sector. Las contraseñas se toman de `SEED_PASSWORD_ADMIN` y `SEED_PASSWORD_ENCARGADO`; si no están definidas se generan al azar y se muestran **una sola vez**. No hay contraseñas por defecto.

**Panel del administrador (22 nov).**
- Todas las rutas `/api/admin/...` exigen sesión con rol `ADMIN`.
- Los filtros de fecha son `AAAA-MM-DD` en hora de Bolivia, inclusive. Cada listado devuelve como máximo 500 registros.
- **Tarifas:** al cambiar la tarifa se cierra la anterior y se crea una nueva. Las reservas ya hechas conservan el monto que tenían.
- **Encargados:** la contraseña debe tener de 8 a 72 caracteres con letras y números. Solo se pueden editar usuarios con rol `ENCARGADO`. Ninguna respuesta incluye contraseñas ni hashes.
- Cada cambio queda en la bitácora con el administrador responsable.
- Pendiente: exportar reportes a PDF o Excel (RF-34) y gestionar sectores y lugares (RF-27).

## Estructura

```
backend/
├── db/
│   └── schema.sql            # tablas PostgreSQL y datos iniciales
├── postman/                  # colección de pruebas de Postman
├── src/
│   ├── config/               # variables de entorno y pool de PostgreSQL
│   ├── controllers/          # lógica de cada endpoint
│   ├── middlewares/          # manejo de errores y 404
│   ├── models/               # consultas SQL
│   ├── routes/               # definición de rutas REST
│   ├── services/             # reglas de negocio (reservas)
│   ├── utils/                # fechas en hora de Bolivia y utilidades
│   ├── app.js                # configuración de Express
│   └── server.js             # arranque y cierre del servidor
├── .env.example
├── .gitignore
└── package.json
```

## Pruebas con Postman

Importa `postman/Sistema-Parqueo.postman_collection.json` en Postman. La variable `baseUrl` apunta por defecto a `http://localhost:3000` y `idSector` a `1`.

## Pendiente / dependencias del Trío A

- El script SQL del modelo físico fue **convertido a PostgreSQL** en `db/schema.sql`. Si el Trío A entrega su versión definitiva, hay que comparar y unificar diferencias.
- Las **tarifas** iniciales (3.00 Bs por sector) son un valor de ejemplo cargado en `db/schema.sql`; hay que confirmar el monto real. El administrador podrá cambiarlas (RF-28).
- Exportar los reportes a PDF o Excel (RF-34) y crear o editar sectores y lugares (RF-27).
- Falta definir cómo se **libera** un lugar `OCUPADO` cuando el conductor se va (no está en el cronograma ni en los requerimientos).
- La integración con el frontend se realiza el 22 de noviembre.
