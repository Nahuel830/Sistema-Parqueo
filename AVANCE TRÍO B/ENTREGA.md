# Entrega – Avance del Trío B (Sistema de Parqueo de Tarija)

Estado del backend al cierre del cronograma (23 de noviembre). Todo lo que se dice aquí fue probado con una API y un PostgreSQL 16 reales; lo que no se pudo probar se indica.

## Qué se entrega
- **API REST** (Node.js + Express + PostgreSQL) en `backend/`: sectores y lugares, reservas de 5 minutos con expiración, pagos por QR y efectivo, fichas electrónicas, login con JWT y bcrypt, panel del encargado y panel del administrador.
- **Documentación** en `docs/`: casos de uso, diagramas de flujo, definición de la API e integración con el frontend.
- **Colección de Postman** y **pruebas automáticas** (ver abajo).

## Cómo ponerlo en marcha
1. Crear la base en PostgreSQL (`parqueo_tarija`) y cargar `backend/db/schema.sql`. **El script borra y recrea las tablas.**
2. Copiar `backend/.env.example` a `backend/.env` y completar `DB_PASSWORD`, `JWT_SECRET` (32 caracteres o más) y `PASARELA_SECRET` (16 o más).
3. En `backend/`: `npm install`, `npm run seed:usuarios` (crea el administrador y un encargado por sector; guarda las contraseñas que muestra) y `npm run dev`.
4. Frontend (Trío A): `cd frontend`, `npm ci`, `npm run dev`, y abrir `http://localhost:5173`.

## Pruebas
| Comando | Qué hace | Resultado |
|---|---|---|
| `npm test` | Pruebas unitarias (token de reserva, autenticación, roles, límite de intentos y validaciones del administrador). No necesita base de datos. | 36 pruebas, todas pasan |
| `npm run test:integracion` | Flujo completo contra PostgreSQL real: reservas, concurrencia, expiración, QR, efectivo, login, permisos, tarifas, reportes y bitácora. **Reinicia las tablas**, por eso solo corre si `DB_NAME` contiene "test". | 18 pruebas, todas pasan |

Comprobaciones adicionales hechas a mano:
- Al romper a propósito el límite por sector, la prueba de integración correspondiente falló (las pruebas detectan el error).
- El frontend real del Trío A se probó con un navegador contra la API (ver `docs/integracion-frontend-backend.md`).
- **Carga local (RNF-03):** 200 conductores simultáneos consultando los lugares respondieron todos 200, con p95 de 223 ms. 200 conductores reservando a la vez 20 lugares dieron exactamente 20 reservas y 180 conflictos (409), sin ningún lugar con dos reservas. Fue en una sola computadora, no en un servidor real.

## Requerimientos funcionales

| Requerimientos | Estado | Notas |
|---|---|---|
| RF-01 a RF-15 (conductor) | Cumplidos en API y frontend | RF-04: el frontend consulta cada segundo, no usa conexión en vivo. RF-09 y RF-11: el banco está **simulado** (confirmación protegida con `PASARELA_SECRET`). |
| RF-16 a RF-25 (encargado) | Cumplidos en la **API** | Falta la pantalla del encargado (Trío A). RF-23: la notificación se consulta, no se empuja. |
| RF-26, RF-28 a RF-33 y RF-35 (administrador) | Cumplidos en la **API** | Falta la pantalla del administrador (Trío A). |
| RF-34 reportes | Parcial | Resumen de ingresos, ocupación y cancelaciones en JSON. Falta exportar a PDF o Excel. |
| RF-27 sectores y lugares | **Pendiente** | Se cargan por script; no hay endpoints para crearlos o editarlos. |
| RF-36 a RF-39 (reglas) | Cumplidos | Un lugar por conductor (índice único y bloqueos de fila), código de ficha único, bitácora con responsable y confirmación QR que respeta la vigencia. |
| RF-40 | Parcial | Agregar sectores y lugares no requiere cambiar código, pero depende de RF-27. |

## Requerimientos no funcionales

| Requerimiento | Estado |
|---|---|
| RNF-03 (200 usuarios) y RNF-04 (QR y ficha en menos de 3 s) | Probados en local, cumplen |
| RNF-06 contador en el servidor, RNF-09 operaciones atómicas | Cumplidos |
| RNF-10 bcrypt, RNF-12 roles, RNF-15 códigos no adivinables, RNF-16 auditoría, RNF-17 sin datos bancarios | Cumplidos |
| RNF-14 | Consultas parametrizadas (SQL), sin cookies (CSRF) y solo JSON. No se hizo una auditoría de XSS del frontend. |
| RNF-13 sesiones | Parcial: el token vence a las 2 horas fijas (`JWT_EXPIRES_IN`), no por inactividad. |
| RNF-30 y RNF-31 | Cumplidos: hora de Bolivia (UTC−4) y bolivianos. |
| RNF-01, RNF-02, RNF-18 a RNF-24 | No medidos aquí (red 4G, frontend y navegadores). El frontend consulta cada segundo, por lo que un cambio de estado se ve en 1 o 2 segundos. |
| RNF-05 disponibilidad, RNF-08 copias de seguridad, RNF-11 HTTPS | **Pendientes**: dependen del despliegue, que no se hizo. |
| RNF-07 no perder pagos | Las operaciones son transacciones; no se probaron caídas del servidor. |
| RNF-28 normativa y tarifas | **Por confirmar:** la tarifa cargada (3,00 Bs por sector) es un valor de ejemplo. |

## Límites conocidos
- La pasarela de pago es simulada. Con un banco real hay que adaptar `POST /api/pagos/qr/confirmar`.
- Un lugar `OCUPADO` no se libera solo: no está definido en los requerimientos cuándo termina la estadía.
- El límite de intentos de login está en memoria: se reinicia con el servidor y no se comparte entre varias instancias. Detrás de un proxy hay que configurar `trust proxy` para que la IP sea la correcta.
- Los listados del administrador devuelven como máximo 500 registros.
- Las contraseñas y claves de las pruebas son de ejemplo; en un entorno real deben ser otras.
