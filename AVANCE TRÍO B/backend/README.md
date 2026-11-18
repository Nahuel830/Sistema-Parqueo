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

> Las columnas de fecha usan `TIMESTAMPTZ` y se operan en hora de Bolivia (UTC−4). La reserva de 5 minutos se calculará en el servidor a partir del 19 de noviembre.

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

Las respuestas usan el formato `{ "ok": true, "mensaje": "...", "datos": ... }`. Un sector inexistente responde `404`, un identificador inválido `400`, y si la base de datos no está disponible, `503`. Las rutas no existentes responden `404` con un mensaje en español y los errores internos responden `500` sin exponer detalles.

Las consultas usan sentencias parametrizadas de PostgreSQL (`$1`, `$2`) para prevenir inyección SQL.

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
- Las **tarifas** no se cargaron como dato inicial: las configura el administrador (RF-28). Se necesitará al menos una tarifa activa por sector para crear reservas el 19 de noviembre.
- Los endpoints de reservas, pagos, fichas y autenticación se agregan en las actividades del 19 al 21 de noviembre.
- La integración con el frontend se realiza el 22 de noviembre.
