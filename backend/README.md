# Backend – Sistema de Parqueo de Tarija

API REST (JSON) del Sistema de Parqueo. Construida con **Node.js + Express**, **MySQL (InnoDB)**, autenticación **JWT + bcrypt**. Todas las fechas se manejan en la zona horaria de Bolivia (`America/La_Paz`, UTC−4) y la moneda es el boliviano (Bs).

## Requisitos

- Node.js 18 o superior (probado con Node.js 24).
- npm 9 o superior.
- MySQL 8 (la base de datos se crea en la actividad del 18 de noviembre).

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

3. Ajusta `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` según tu MySQL local.

> El archivo `.env` está en `.gitignore`. Nunca lo subas al repositorio.

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
| GET | `/api/estado/bd` | Verifica la conexión con MySQL (responde 503 si no está disponible). |

Las rutas no existentes responden `404` con un mensaje en español y los errores internos responden `500` sin exponer detalles.

## Estructura

```
backend/
├── postman/                  # colección de pruebas de Postman
├── src/
│   ├── config/               # variables de entorno y pool de MySQL
│   ├── controllers/          # lógica de cada endpoint
│   ├── middlewares/          # manejo de errores y 404
│   ├── models/               # consultas SQL (a partir del 18 nov)
│   ├── routes/               # definición de rutas REST
│   ├── utils/                # fechas en hora de Bolivia
│   ├── app.js                # configuración de Express
│   └── server.js             # arranque y cierre del servidor
├── .env.example
├── .gitignore
└── package.json
```

## Pruebas con Postman

Importa `postman/Sistema-Parqueo.postman_collection.json` en Postman. La variable `baseUrl` apunta por defecto a `http://localhost:3000`.

## Pendiente / dependencias del Trío A

- **Script SQL del modelo físico**: el modelo de la rama `modelos-base-de-datos` está escrito con sintaxis PostgreSQL (`SERIAL`, `BOOLEAN`, `now()`). Para este backend se necesita la versión **MySQL/InnoDB** con las 2 tablas semilla de sectores y los 40 lugares.
- Los endpoints de sectores, lugares, reservas, pagos, fichas y autenticación se agregan en las actividades del 18 al 21 de noviembre.
- La integración con el frontend se realiza el 22 de noviembre.
