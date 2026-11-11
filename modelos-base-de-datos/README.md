# Modelos de la base de datos – Sistema de Parqueo Tarija

Esta carpeta contiene los **3 modelos de diagramas** de la base de datos, hechos en [draw.io](https://app.diagrams.net) (archivo `modelos-bd-sistema-parqueo.drawio`, una pestaña por modelo):

| Pestaña | Modelo | Qué muestra |
|---|---|---|
| 1. Conceptual | Modelo conceptual (Entidad-Relación, notación Chen) | Entidades, atributos, relaciones y cardinalidades (mín,máx). Sin claves foráneas ni tipos de datos. |
| 2. Lógico-Relacional | Modelo lógico / relacional | Tablas con sus columnas, claves primarias (PK), claves foráneas (FK) y el esquema relacional en texto. |
| 3. Físico | Modelo físico (PostgreSQL) | Tipos de datos, restricciones (NOT NULL, UNIQUE, DEFAULT, CHECK, FK) e índices. |

## Entidades

SECTOR, LUGAR, TARIFA, USUARIO (encargado/administrador), RESERVA, PAGO, FICHA, CANCELACION, NOTIFICACION y BITACORA (auditoría).

El conductor no es una entidad porque no tiene login; solo se guarda la `placa` en la reserva.

## Cómo abrirlo

Entrar a https://app.diagrams.net → **Archivo → Abrir desde → Dispositivo** y elegir `modelos-bd-sistema-parqueo.drawio`.
