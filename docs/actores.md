# Actores del Sistema de Parqueo – Tarija

## 1. Actores principales

### 1.1 Conductor (usuario público)
- **Autenticación:** no requiere login ni registro.
- **Descripción:** persona que busca un lugar donde estacionar su vehículo en los sectores habilitados.
- **Responsabilidades / acciones:**
  - Consultar sectores y disponibilidad de lugares.
  - Seleccionar un lugar libre y reservarlo.
  - Pagar por QR o elegir pago en efectivo.
  - Recibir la ficha electrónica.
  - Cancelar la reserva dentro de los 5 minutos.
  - Presentar la ficha al encargado en el lugar.

### 1.2 Encargado de sector
- **Autenticación:** login con usuario y contraseña, asignado por el administrador.
- **Descripción:** funcionario de la Alcaldía que controla físicamente un sector (Plaza Sucre o Palacio de Justicia).
- **Responsabilidades / acciones:**
  - Ver el estado de los lugares de su sector.
  - Recibir las fichas electrónicas de los conductores.
  - Verificar la ficha contra el conductor y el vehículo.
  - Cobrar en efectivo cuando corresponda.
  - Marcar el sitio como **pagado/cancelado**.
  - Solo accede a la información de **su** sector.

### 1.3 Administrador
- **Autenticación:** login con usuario y contraseña.
- **Descripción:** responsable de la configuración y supervisión de todo el sistema.
- **Responsabilidades / acciones:**
  - Gestionar sectores, lugares y tarifas.
  - Crear, editar y desactivar encargados y asignarlos a sectores.
  - Revisar cancelaciones y reservas expiradas.
  - Consultar reportes de ingresos, ocupación y cobros.
  - Auditar la actividad del sistema.

## 2. Actores secundarios

### 2.1 Pasarela de pago / servicio QR (sistema externo)
Genera el código QR y confirma al sistema que el pago fue realizado.

### 2.2 Temporizador del sistema (actor interno)
Controla los 5 minutos de reserva: expira reservas no concretadas y libera el lugar automáticamente.

## 3. Interesados (no usan el sistema directamente)

- **Alcaldía de Tarija:** entidad que recibe la recaudación y define sectores y tarifas.

## 4. Resumen de interacción

| Actor | Login | Conductor-lugar | Ficha | Cancelaciones | Reportes |
|---|---|---|---|---|---|
| Conductor | No | Reserva y paga | Recibe y muestra | Cancela (≤ 5 min) | – |
| Encargado | Sí | Verifica | Recibe y valida | – | – |
| Administrador | Sí | Configura | – | Revisa y audita | Sí |
