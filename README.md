# Sistema de Parqueo – Tarija, Bolivia

Sistema web para consultar, reservar y pagar espacios de parqueo tarifado en sectores de la ciudad de Tarija donde cobra la Alcaldía.

## Descripción

El conductor (sin necesidad de login) ingresa al sistema, elige un sector, ve en tiempo real qué lugares están libres, selecciona uno y lo paga por **QR** o en **efectivo**. El pago genera una **ficha electrónica** que le llega al **encargado del sector**, quien la verifica físicamente con el conductor. El lugar se reserva por **5 minutos** para evitar cobros irregulares y el conductor puede cancelar dentro de ese lapso. El administrador audita las cancelaciones.

## Alcance inicial

| Sector | Lugares |
|---|---|
| Plaza Sucre | 20 |
| Palacio de Justicia | 20 |
| **Total** | **40** |

## Actores

- **Conductor** (público, sin login)
- **Encargado de sector** (con login)
- **Administrador** (con login)

## Flujo resumido

1. El conductor elige sector y lugar libre.
2. El lugar queda reservado 5 minutos.
3. El conductor elige pago por QR o efectivo.
4. Al confirmar el pago, la ficha electrónica llega al encargado del sector.
5. El conductor llega al lugar y muestra la ficha; el encargado la verifica y marca el sitio como **cancelado/pagado**.
6. Si el conductor ya no lo quiere, cancela dentro de los 5 minutos; si no llega a tiempo, la reserva expira y el lugar se libera.
7. El administrador revisa cancelaciones y expiraciones.

## Documentación

| Documento | Archivo |
|---|---|
| Requerimientos funcionales | [`requisitos/requerimientos-funcionales.md`](requisitos/requerimientos-funcionales.md) |
| Requerimientos no funcionales | [`requisitos/requerimientos-no-funcionales.md`](requisitos/requerimientos-no-funcionales.md) |
| Actores | [`requisitos/actores.md`](requisitos/actores.md) |
| Diagramas (casos de uso, flujos, arquitectura, estados y base de datos) | [`diagramas/`](diagramas/) |
| Modelos de la base de datos | [`modelos-base-de-datos/`](modelos-base-de-datos/) |
| Cronograma | [`cronograma.md`](cronograma.md) |
| Tablero de Jira | [`enlace Jira/`](enlace%20Jira/) |
| Backend y entrega del Trío B | [`AVANCE TRÍO B/`](AVANCE%20TR%C3%8DO%20B/) |
| Frontend | [`frontend/`](frontend/) |


## Definiciones, acrónimos y abreviaturas

Término / acrónimo	Definición

SRS	Especificación de Requerimientos de Software (Software Requirements Specification).

IEEE;	Institute of Electrical and Electronics Engineers; entidad citada en el formato de referencia.
PRD;	Documento de Requisitos del Producto; término incluido en la guía.
MRD;	Documento de Requisitos de Marketing; término incluido en la guía.
QR;	Código de respuesta rápida, utilizado para presentar los datos de una solicitud de cobro.
Sector;	Zona de parqueo tarifado bajo seguimiento de un encargado.
Espacio / plaza;	Unidad individual y numerada de estacionamiento.
Reserva temporal	Retención provisional de un espacio durante cinco minutos.
Ficha electrónica	;Comprobante o identificador digital asociado a una reserva y a su estado de pago.
Validación presencial;	Acción del encargado para confirmar la ficha presentada por el conductor.
Auditoría	;Consulta del historial de acciones, cancelaciones, vencimientos y verificaciones.


## Cómo ejecutar en Windows

> [!IMPORTANT]
> Requisitos previos: [Node.js ≥ 18](https://nodejs.org/) y [PostgreSQL ≥ 14](https://www.postgresql.org/download/windows/) instalados.

### 1. Instalar PostgreSQL y crear la base de datos

1. Descarga e instala PostgreSQL desde [postgresql.org](https://www.postgresql.org/download/windows/).  
   Durante la instalación, anota la contraseña que definas para el usuario `postgres`.
2. Abre **pgAdmin** o **psql** y ejecuta:
   ```sql
   CREATE DATABASE parqueo_tarija;
   ```
3. Aplica el esquema desde la raíz del proyecto (en PowerShell):
   ```powershell
   $env:PGPASSWORD="tu_contraseña"
   psql -U postgres -h 127.0.0.1 -d parqueo_tarija -f "AVANCE TRÍO B/backend/db/schema.sql"
   ```

### 2. Configurar el archivo `.env` del backend

Copia el ejemplo y edítalo:

```powershell
Copy-Item "AVANCE TRÍO B/backend/.env.example" "AVANCE TRÍO B/backend/.env"
```

Luego abre `AVANCE TRÍO B/backend/.env` y ajusta estos valores:

```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña_de_postgres
DB_NAME=parqueo_tarija
JWT_SECRET=una_cadena_aleatoria_de_al_menos_32_caracteres
PASARELA_SECRET=al_menos_16_caracteres
SEED_PASSWORD_ADMIN=admin1234
SEED_PASSWORD_ENCARGADO=password
```

> [!CAUTION]
> El archivo `.env` **nunca** debe subirse a git; ya está excluido en `.gitignore`.

### 3. Instalar dependencias

Desde la **raíz** del proyecto:

```powershell
npm run install:all
```

Esto instala las dependencias de la raíz, del backend y del frontend.

### 4. Crear los usuarios iniciales

```powershell
npm --prefix "AVANCE TRÍO B/backend" run seed:usuarios
```

Esto crea en la base de datos los usuarios de prueba locales:

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin1234` | Administrador |
| `encargado1` | `password` | Encargado – Plaza Sucre |
| `encargado2` | `password` | Encargado – Palacio de Justicia |

> [!NOTE]
> Estas contraseñas son solo para entorno local de desarrollo y se leen del `.env`.  
> En producción usa contraseñas fuertes y no las publiques.

### 5. Levantar el sistema completo

```powershell
npm run dev
```

Esto levanta en paralelo:
- **API** → http://localhost:3000
- **Frontend** → http://localhost:5173

### Verificar que todo funciona

```powershell
# Sectores disponibles (debe devolver Plaza Sucre y Palacio de Justicia)
Invoke-WebRequest -Uri http://localhost:3000/api/sectores -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## Nombres  
Nahuel Fernando Martinez Mariscal/
Jose Manuel Huarachi Colque/
Xavier Castrillo/
Sergio Villa Rubia/
Rodrigo Porcel /
Enny Lopez
