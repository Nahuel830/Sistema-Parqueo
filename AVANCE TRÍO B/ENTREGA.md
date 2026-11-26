# Entrega – Avance del Trío B (Sistema de Parqueo de Tarija)

Estado del sistema al 26 de noviembre de 2026. Las pruebas iniciales usaron PostgreSQL 16 y las pruebas de las correcciones usaron PostgreSQL 17.

## Qué se entrega
- **API REST** (Node.js + Express + PostgreSQL) en `backend/`: sectores y lugares, reservas de 5 minutos con expiración, pagos por QR y efectivo, fichas electrónicas, login con JWT y bcrypt, panel del encargado y panel del administrador.
- **Documentación** en `docs/`: casos de uso, diagramas de flujo, definición de la API e integración con el frontend.
- **Colección de Postman** y **pruebas automáticas** (ver abajo).

## Cómo ponerlo en marcha
1. En una base nueva, cargar `backend/db/schema.sql`. **El script borra y recrea las tablas.** Para actualizar una base existente, aplicar `backend/db/migraciones/001-pagos-red-enlace.sql`.
2. Copiar `backend/.env.example` a `backend/.env` y completar `DB_PASSWORD` y `JWT_SECRET` (32 caracteres o más). Para habilitar los cobros por QR, sigue la [configuración de Red Enlace](backend/README.md#activar-qr-con-red-enlace).
3. En `backend/`: `npm install`, `npm run seed:usuarios` (crea el administrador y un encargado por sector; guarda las contraseñas que muestra) y `npm run dev`.
4. Frontend (Trío A): `cd frontend`, `npm ci`, `npm run dev`, y abrir `http://localhost:5173`.

## Pruebas
| Comando | Qué hace | Resultado |
|---|---|---|
| `npm test` | Pruebas unitarias de reservas, pagos, autenticación, roles y validaciones. | 89 pruebas aprobadas |
| `npm run test:integracion` | API con PostgreSQL, incluidos salidas, catálogo, descargas y QR con respuestas controladas de Red Enlace. Reinicia las tablas de la base de prueba. | 22 pruebas aprobadas |

Comprobaciones del avance inicial:
- Al romper a propósito el límite por sector, la prueba de integración correspondiente falló (las pruebas detectan el error).
- El frontend real del Trío A se probó con un navegador contra la API (ver `docs/integracion-frontend-backend.md`).
- **Carga local (RNF-03):** 200 conductores simultáneos consultando los lugares respondieron todos 200, con p95 de 223 ms. 200 conductores reservando a la vez 20 lugares dieron exactamente 20 reservas y 180 conflictos (409), sin ningún lugar con dos reservas. Fue en una sola computadora, no en un servidor real.

## Requerimientos funcionales

| Requerimientos | Estado | Notas |
|---|---|---|
| RF-01 a RF-15 (conductor) | Implementados en API y frontend | La disponibilidad se consulta cada segundo. Los cobros reales por QR requieren credenciales y certificación de Red Enlace. |
| RF-16 a RF-25 (encargado) | Disponibles en la API | El panel web consulta los lugares del sector y registra salidas. Las notificaciones, el cobro y la verificación de fichas se operan por API. |
| RF-26, RF-28 a RF-33 y RF-35 (administrador) | Disponibles en la API | El panel web incluye cancelaciones y bitácora. Las tarifas, los encargados y el listado de pagos se gestionan por API. |
| RF-34 reportes | Implementado | Resumen de ingresos, ocupación y cancelaciones con descarga PDF y Excel. |
| RF-27 y RF-40 sectores y lugares | Implementados | El administrador puede crear, editar, desactivar y reactivar desde el panel. |
| RF-36 a RF-39 (reglas) | Implementados | Una reserva activa por lugar, ficha única, bitácora y conciliación QR en función de la hora bancaria. |

## Requerimientos no funcionales

| Requerimiento | Estado |
|---|---|
| RNF-03 (200 usuarios) y RNF-04 (QR y ficha en menos de 3 s) | Medidos en el avance local con la pasarela simulada. |
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
- El adaptador de Red Enlace se verificó con respuestas de prueba. La certificación y la activación del comercio están pendientes.
- El encargado registra la salida del vehículo para liberar el lugar. La aplicación conserva la ficha y el pago en el historial.
- El límite de intentos de login está en memoria: se reinicia con el servidor y no se comparte entre varias instancias. Detrás de un proxy hay que configurar `trust proxy` para que la IP sea la correcta.
- Los listados del administrador devuelven como máximo 500 registros.
- Las contraseñas y claves de las pruebas son de ejemplo; en un entorno real deben ser otras.
