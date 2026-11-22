# Frontend público de Parqueo Tarija

Vista pública con React, Vite, JSX y CSS para elegir un sector, consultar el plano esquemático y seleccionar un lugar libre.

## Desarrollo local

1. Arranca PostgreSQL y la API existente según el [README del backend](../AVANCE%20TR%C3%8DO%20B/backend/README.md).
2. Desde la raíz del repositorio, con Node.js 20.19+ en la rama 20 o 22.12+:

   ```powershell
   cd frontend
   npm.cmd ci
   npm.cmd run dev
   ```

3. Abre la URL que indica Vite, normalmente `http://localhost:5173`.

Vite redirige `/api` a `http://127.0.0.1:3000` durante el desarrollo y la vista previa. Para otro puerto, copia `.env.example` a `.env.local` y ajusta `API_PROXY_TARGET`. Ejecuta `npm.cmd run build` para generar `dist/`. En producción, sirve `/api` desde el mismo origen o establece `VITE_API_URL` antes de compilar y configura el origen permitido en el servidor que ya aloja la API.

## Disponibilidad

La vista usa `GET /api/sectores` y `GET /api/sectores/:id/lugares`. Mientras se muestra el plano, consulta una vez por segundo el sector activo, con una sola solicitud a la vez. Al volver a la pestaña actualiza el plano. Si falla la consulta, conserva la última vista y pausa la selección hasta recuperar datos actuales. La latencia depende de la API, la red y el navegador.

## Reserva y contador

Al elegir un lugar libre, la vista crea la reserva mediante `POST /api/reservas`. El panel «Tu reserva» muestra el tiempo restante según `fechaExpiracion`. Mientras la reserva está activa, puedes cambiar de sector y seguir viendo el contador. El ID y el token se conservan en la sesión de la pestaña para recuperar la reserva tras recargar.

Al llegar a cero, la vista confirma el estado con `GET /api/reservas/:id` y actualiza el plano cuando finaliza la reserva. Si otro conductor reserva antes el mismo lugar, la API rechaza el intento y la vista vuelve a consultar la disponibilidad.

## Pago y ficha

El panel de reserva muestra el monto y usa `POST /api/reservas/:id/pago` para elegir QR o efectivo. La imagen se genera con el código QR que devuelve la API. El frontend detecta la confirmación consultando `GET /api/reservas/:id/ficha` cada dos segundos mientras espera. La confirmación bancaria corresponde a la pasarela y el backend actual la simula. En efectivo la API emite la ficha para pagar al encargado del sector.

Para usar tu propia imagen, colócala en `public/pagos/qr.png` y define `VITE_QR_IMAGEN=/pagos/qr.png` en `.env.local`. Reinicia Vite o vuelve a compilar. Puedes reemplazar el archivo manteniendo ese nombre o cambiar la variable para indicar otra ruta. Una imagen fija solo sirve para confirmar un pago si la pasarela puede relacionarlo con la reserva que inició la API.

«Volver a ver ficha» vuelve a consultar el estado de la ficha. El navegador guarda las referencias de las fichas para poder abrirlas en una visita posterior mientras sigan vigentes.
