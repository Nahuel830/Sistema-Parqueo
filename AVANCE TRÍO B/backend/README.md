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

4. Deja `PASARELA_PROVEEDOR=simulada` y genera un `PASARELA_SECRET` local de al menos 16 caracteres para confirmar el QR durante la demostración.

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
| GET | `/api/reservas/:id` | Consulta la reserva con `x-reserva-token`. Al vencer, el backend concilia el QR pendiente antes de cerrar la reserva. |
| POST | `/api/reservas/:id/cancelar` | Cancela dentro de los 5 minutos (header `x-reserva-token`) y libera el lugar. |
| POST | `/api/reservas/:id/pago` | El conductor elige `QR` o `EFECTIVO` con `x-reserva-token`. Red Enlace devuelve `imagenQr` (PNG en una URL de datos). En efectivo se emite la ficha. |
| GET | `/api/reservas/:id/ficha` | El conductor consulta su ficha electrónica (header `x-reserva-token`). |
| POST | `/api/pagos/qr/confirmar` | Webhook con `x-pasarela-secret`. Red Enlace envía `numeroReferencia` en el cuerpo o dentro de `data`. La API verifica la transacción con Red Enlace antes de emitir la ficha. |
| POST | `/api/auth/login` | Inicia sesión (`{ "username": "...", "password": "..." }`). Devuelve un JWT para el header `Authorization: Bearer <token>`. |
| GET | `/api/auth/yo` | Datos del usuario con sesión iniciada. |
| GET | `/api/encargado/lugares` | Lugares de **su** sector con su estado (rol ENCARGADO). |
| POST | `/api/encargado/lugares/:id/liberar` | Registra una salida con `{ "idReserva": 123 }` a partir de la ocupación actual y deja el lugar `LIBRE`. |
| GET | `/api/encargado/fichas` | Fichas de su sector. Hoy por defecto; filtros `?estado=` y `?fecha=AAAA-MM-DD` o `todas`. |
| GET | `/api/encargado/fichas/:codigo` | Detalle de una ficha para compararla con la del conductor. |
| POST | `/api/encargado/fichas/:codigo/cobrar` | Registra el cobro en efectivo; el lugar pasa a `OCUPADO`. |
| POST | `/api/encargado/fichas/:codigo/verificar` | Ficha `EMITIDA` → `VERIFICADA` (exige el pago confirmado). |
| POST | `/api/encargado/fichas/:codigo/pagada` | Ficha `VERIFICADA` → `PAGADA`. |
| GET | `/api/encargado/notificaciones` | Fichas nuevas (`?noLeidas=true`). `POST .../:id/leida` la marca como leída. |
| GET | `/api/admin/lugares` | Estado de los 40 lugares (rol ADMIN). |
| GET / POST | `/api/admin/sectores` | Lista sectores activos y desactivados. Crea con `nombre`, `descripcion` opcional y `monto` inicial en Bs. |
| PATCH | `/api/admin/sectores/:idSector` | Edita `nombre`, `descripcion` o `activo`. |
| GET / POST | `/api/admin/sectores/:idSector/lugares` | Lista los lugares del sector y crea uno con `numero`. |
| PATCH | `/api/admin/sectores/:idSector/lugares/:id` | Cambia el `numero` o `activo`. |
| GET | `/api/admin/cancelaciones` | Cancelaciones y expiraciones. Filtros `desde`, `hasta`, `idSector`, `tipo`. |
| GET | `/api/admin/pagos` | Pagos y fichas. Filtros `desde`, `hasta`, `idSector`, `metodo`. |
| GET | `/api/admin/reportes/resumen` | Ingresos por sector y método, ocupación y cancelaciones por tipo. |
| GET | `/api/admin/reportes/resumen/pdf`, `/api/admin/reportes/resumen/xlsx` | Descarga el resumen en PDF o Excel con los mismos filtros. |
| GET | `/api/admin/bitacora` | Acciones auditadas, incluidos responsable y momento del cambio. |
| GET / PUT | `/api/admin/tarifas`, `/api/admin/tarifas/:idSector` | Consulta y cambia la tarifa (`{ "monto": "4.50" }`). |
| GET / POST | `/api/admin/encargados` | Lista y crea encargados. `PATCH /:id` edita o desactiva; `POST /:id/password` restablece la contraseña. |

**Reservas (19 nov).** El conductor no tiene login: la reserva se identifica con un `tokenReserva` firmado (HMAC con `JWT_SECRET`) que se envía en el header `x-reserva-token`. Un barrido cada 5 segundos expira las reservas vencidas, libera el lugar y registra la cancelación por expiración y la bitácora. Reservar usa transacciones con bloqueo de fila, así que dos conductores no pueden tomar el mismo lugar.

Las respuestas usan el formato `{ "ok": true, "mensaje": "...", "datos": ... }`. Un sector inexistente responde `404`, un identificador inválido `400`, y si la base de datos no está disponible, `503`. Las rutas no existentes responden `404` con un mensaje en español y los errores internos responden `500` sin exponer detalles.

Las consultas usan sentencias parametrizadas de PostgreSQL (`$1`, `$2`) para prevenir inyección SQL.

**Pagos y fichas (20 nov).**
- **QR:** el pago queda `PENDIENTE` hasta que el proveedor lo verifica. Tras comprobar referencia, importe, moneda y hora bancaria, el backend confirma el pago, marca la reserva `PAGADA`, ocupa el lugar y emite una ficha única. Una confirmación repetida conserva la ficha existente.
- **Efectivo:** se emite la ficha al elegirlo; el pago queda `PENDIENTE` hasta que el encargado cobre (se agrega con el login, 21 nov). Si el conductor cancela o la reserva vence, la ficha se `ANULA` y el pago se `RECHAZA`.
- Al emitir una ficha se crea una **notificación** para los encargados activos del sector (RF-19, RF-23) y se registra todo en la **bitácora**.

### Probar un pago QR simulado

El archivo `.env.example` selecciona el modo simulado para desarrollo. La API devuelve `codigoQr`, `referencia` y `simulado: true` al iniciar el pago. La pantalla muestra que es un QR de prueba.

Para simular la confirmación, envía `POST /api/pagos/qr/confirmar` con el encabezado `x-pasarela-secret` igual a tu `PASARELA_SECRET` local. Usa `{ "referencia": "..." }` con la referencia devuelta al iniciar el pago. La API emite la ficha y marca el lugar como ocupado. Puedes usar la solicitud «Confirmar pago QR (pasarela)» de la colección de Postman.

Para operar solo en efectivo usa `PASARELA_PROVEEDOR=deshabilitada`.

### Activar QR con Red Enlace

1. Para una base existente, aplica `db/migraciones/001-pagos-red-enlace.sql` con `psql -v ON_ERROR_STOP=1 -d parqueo_tarija -f db/migraciones/001-pagos-red-enlace.sql`. En una instalación nueva, `db/schema.sql` ya incluye estos cambios.
2. Configura `PASARELA_PROVEEDOR=redenlace` y un `PASARELA_SECRET` de al menos 16 caracteres. Completa `REDENLACE_URL`, `REDENLACE_BASIC` (valor de la credencial sin el prefijo `Basic`), `REDENLACE_CLIENT_ID`, `REDENLACE_ID_ESTABLECIMIENTO` y `REDENLACE_NOMBRE_ESTABLECIMIENTO`.
3. Define `REDENLACE_WEBHOOK_URL` con la URL HTTPS accesible para Red Enlace que termina en `/api/pagos/qr/confirmar`. Red Enlace requiere certificación antes de entregar credenciales productivas. [Documentación oficial de QR Simple](https://openhub.redenlace.com.bo/es/products/apis-de-cobro-mediante-qr/cobro-por-qr-simple)

La vigencia del QR reserva cinco segundos de margen respecto del vencimiento local. Si quedan menos de diez segundos de vigencia para el QR, el conductor aún puede elegir efectivo. Al vencer, cancelar o cambiar a efectivo, la API comprueba con la pasarela si se acreditó el QR. Un pago bancario registrado dentro del plazo se aplica aunque la notificación llegue después. Si la pasarela no está disponible, la reserva permanece vinculada al lugar y el barrido vuelve a intentar verificarla. Un cobro que requiere conciliación manual queda en bitácora como `QR_REQUIERE_CONCILIACION`.

**Login y panel del encargado (21 nov).**
- **Login:** JWT firmado con `JWT_SECRET` (HS256, vence según `JWT_EXPIRES_IN`) y contraseñas con **bcrypt**. Ante un usuario o contraseña incorrectos responde siempre el mismo mensaje. Después de 5 intentos fallidos seguidos (por IP y usuario) bloquea 15 minutos (429).
- **Cada petición** comprueba el token y que el usuario siga activo: si el administrador lo desactiva, pierde el acceso de inmediato.
- **Roles:** el panel del encargado exige el rol `ENCARGADO` y todas las consultas se limitan a **su sector**; una ficha de otro sector responde 404.
- **Efectivo:** `cobrar` → `verificar` → `pagada`. Verificar antes de cobrar responde 409, y cobrar una reserva vencida responde 410.
- **Salida:** el panel `/encargado` permite actualizar los lugares, elegir uno ocupado y confirmar que salió el vehículo. La API valida el sector y el `idReserva` que devolvió `GET /api/encargado/lugares`. Se conserva el historial de pago y la bitácora registra la salida.
- **Crear los usuarios iniciales:** `npm run seed:usuarios` crea `admin` y un `encargado<N>` por sector. Las contraseñas se toman de `SEED_PASSWORD_ADMIN` y `SEED_PASSWORD_ENCARGADO`; si no están definidas se generan al azar y se muestran **una sola vez**. No hay contraseñas por defecto.

**Panel del administrador (22 nov).**
- Todas las rutas `/api/admin/...` exigen sesión con rol `ADMIN`.
- Los filtros de fecha son `AAAA-MM-DD` en hora de Bolivia, inclusive. Cada listado devuelve como máximo 500 registros.
- **Tarifas:** al cambiar la tarifa se cierra la anterior y se crea una nueva. Las reservas ya hechas conservan el monto que tenían.
- **Encargados:** la contraseña debe tener de 8 a 72 caracteres con letras y números. Solo se pueden editar usuarios con rol `ENCARGADO`. Ninguna respuesta incluye contraseñas ni hashes.
- Cada cambio queda en la bitácora con el administrador responsable.
- **Sectores y lugares:** la desactivación conserva los registros históricos. Un sector con lugares reservados u ocupados sigue activo hasta que se liberen. Solo se pueden desactivar o renumerar lugares libres.
- **Reportes:** `desde` y `hasta` filtran ingresos y cancelaciones. `idSector` también filtra la ocupación actual. Las descargas están en la pestaña «Reportes» de `/admin`.

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

## Pruebas automáticas

```bash
npm test                 # unitarias: no necesitan base de datos
npm run test:integracion # flujo completo contra PostgreSQL real
```

La de integración **reinicia las tablas** y por eso solo corre si `DB_NAME` contiene "test". Ejemplo:

```bash
DB_NAME=parqueo_test JWT_SECRET=<32 o más caracteres> PASARELA_PROVEEDOR=simulada PASARELA_SECRET=<16 o más caracteres> BCRYPT_ROUNDS=4 npm run test:integracion
```

El resumen completo del estado y de los requerimientos está en [`../ENTREGA.md`](../ENTREGA.md).

## Pruebas con Postman

Importa `postman/Sistema-Parqueo.postman_collection.json` en Postman. La variable `baseUrl` apunta por defecto a `http://localhost:3000` y `idSector` a `1`.

## Pendiente / dependencias del Trío A

- El script SQL del modelo físico fue **convertido a PostgreSQL** en `db/schema.sql`. Si el Trío A entrega su versión definitiva, hay que comparar y unificar diferencias.
- Las **tarifas** iniciales (3.00 Bs por sector) son un valor de ejemplo cargado en `db/schema.sql`; hay que confirmar el monto real. El administrador podrá cambiarlas (RF-28).
- La certificación y la activación bancaria dependen de Red Enlace. La prueba automatizada usa respuestas controladas del proveedor.
