# Integración frontend y backend (22 de noviembre)

El frontend público del Trío A (`frontend/`, React + Vite) se conecta con la API del Trío B. Esta página resume cómo se conectan y qué se probó.

## Cómo se conectan
- En desarrollo, Vite reenvía `/api` a la API con un proxy. El destino se cambia con `API_PROXY_TARGET` en `frontend/.env.local` (por defecto `http://127.0.0.1:3000`).
- En producción, el frontend y la API deben servirse desde el mismo origen. Si están separados, se define `VITE_API_URL` al compilar el frontend y `CORS_ORIGIN` en el `.env` de la API.
- La API usa `{ ok, mensaje, datos }` para las consultas y devuelve adjuntos para las exportaciones PDF y XLSX.
- El conductor no inicia sesión: guarda el `id` y el `tokenReserva` de su reserva y los envía en el header `x-reserva-token`.

## Cómo levantar todo
1. PostgreSQL con la base `parqueo_tarija` cargada con `backend/db/schema.sql`.
2. API: `cd "AVANCE TRÍO B/backend"`, `npm install`, `npm run dev` (necesita su `.env`).
3. Frontend: `cd frontend`, `npm ci`, `npm run dev`, y abrir `http://localhost:5173`.

## Qué se probó
En el avance del 22 de noviembre se abrió el frontend público en Chromium contra la API y PostgreSQL 16. La prueba de QR usó la pasarela simulada:

| Prueba | Resultado |
|---|---|
| Carga de sectores y plano de 20 lugares | Correcto |
| Elegir un lugar libre y reservarlo (`POST /api/reservas`) | 201; el panel muestra el contador desde 04:59 y el monto |
| El monto refleja la tarifa vigente | Correcto: 4,50 Bs después de que el administrador cambió la tarifa |
| Pagar en efectivo (`POST /api/reservas/:id/pago`) | 201; se muestra la ficha con su código único |
| Pagar por QR | Se muestra la imagen del QR |
| Confirmación simulada (`POST /api/pagos/qr/confirmar`) | El frontend detecta la ficha en menos de 5 segundos y el plano pasa a "Ocupado/pagado" |
| Cancelar la reserva desde la pantalla | El lugar se libera y el contador de reservados baja |
| Dos conductores al mismo lugar | El primero recibe 201 y el segundo 409 |

![Ficha de un pago en efectivo](integracion/ficha-efectivo.png)

![Ficha emitida tras la confirmación simulada](integracion/qr-confirmado.png)

## Observaciones
- Mientras se espera el pago por QR, el frontend consulta `GET /api/reservas/:id/ficha` cada 2 segundos y la API responde **404** hasta que la ficha existe. Es lo esperado y aparece en la consola del navegador. Si se quisiera evitar ese ruido, la API podría responder 200 con `datos: null`, pero habría que adaptar el frontend.
- La versión actual incluye `/admin` para auditoría, sectores, lugares y reportes, y `/encargado` para recibir y validar las fichas del sector (cobro en efectivo, verificación y pago), consultar los lugares y registrar salidas. Ambas pantallas usan `Authorization: Bearer <token>`.
- El adaptador de Red Enlace genera un QR por reserva y verifica la confirmación con el proveedor. Consulta su configuración en el [README del backend](../backend/README.md#activar-qr-con-red-enlace).

## Panel del encargado: fichas (cronograma del 21 de noviembre)
Se probó la pantalla `/encargado` con un navegador contra la API real y PostgreSQL:

| Prueba | Resultado |
|---|---|
| La lista muestra las fichas del sector del encargado y no las de otro sector | Correcto |
| Las fichas nuevas se marcan como "Nueva" y la pestaña "Fichas" muestra cuántas hay | Correcto |
| Una ficha que llega sola aparece en menos de 12 segundos, sin recargar | Correcto |
| Ficha en efectivo: pide confirmar y registra el cobro → verificar → marcar como pagada | Correcto; cada paso cambia el estado en la pantalla y en la lista |
| Sin cobrar, la ficha en efectivo no ofrece verificar | Correcto |
| Una ficha pagada por QR no pide cobrar efectivo y ofrece verificar | Correcto |
| Buscar el código de una ficha de otro sector | Responde "Ficha no encontrada en tu sector" |
| Una ficha anulada avisa y no ofrece acciones | Correcto |
| La pestaña "Lugares y salidas" sigue funcionando | Correcto |
| En el celular no hay desplazamiento horizontal | Correcto |
| Una cuenta de administrador no entra al panel del encargado | Correcto |

![Lista de fichas del encargado](integracion/encargado-fichas.png)

![Detalle de una ficha en efectivo](integracion/encargado-detalle.png)
