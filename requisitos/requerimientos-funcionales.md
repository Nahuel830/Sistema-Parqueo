# Requerimientos Funcionales – Sistema de Parqueo Tarija

Alcance inicial: 2 sectores (Plaza Sucre y Palacio de Justicia), 20 lugares cada uno, 40 en total.

## 1. Módulo Conductor (público, sin login)

| ID | Requerimiento |
|---|---|
| RF-01 | El sistema debe permitir el acceso del conductor sin registro ni login. |
| RF-02 | El sistema debe listar los sectores disponibles (Plaza Sucre, Palacio de Justicia). |
| RF-03 | El sistema debe mostrar, al elegir un sector, los 20 lugares con su estado: **libre**, **reservado** u **ocupado/pagado**. |
| RF-04 | El estado de los lugares debe actualizarse en tiempo real. |
| RF-05 | El conductor debe poder seleccionar un lugar libre. |
| RF-06 | Al seleccionar un lugar, el sistema debe reservarlo de inmediato durante **5 minutos** e impedir que otro conductor lo tome. |
| RF-07 | El sistema debe mostrar un contador regresivo visible con el tiempo restante de la reserva. |
| RF-08 | El sistema debe mostrar el monto a pagar y las opciones de pago: **QR** o **efectivo**. |
| RF-09 | El sistema debe generar un código QR de pago para el lugar seleccionado. |
| RF-10 | El sistema debe mostrar, debajo del QR, la opción de **pago en efectivo**. |
| RF-11 | El sistema debe confirmar automáticamente el pago por QR. |
| RF-12 | Al confirmar el pago (QR) o al elegir efectivo, el sistema debe generar una **ficha electrónica** con código único, sector, lugar, monto, método de pago, fecha y hora. |
| RF-13 | El conductor debe poder **cancelar** la reserva dentro de los 5 minutos y el lugar debe liberarse de inmediato. |
| RF-14 | Si pasan los 5 minutos sin completar el proceso, el sistema debe cancelar la reserva automáticamente y liberar el lugar. |
| RF-15 | El conductor debe poder volver a ver su ficha mientras esté vigente. |

## 2. Módulo Encargado de sector (con login)

| ID | Requerimiento |
|---|---|
| RF-16 | El sistema debe permitir el inicio y cierre de sesión del encargado con usuario y contraseña. |
| RF-17 | El encargado solo debe ver y operar los lugares de **su** sector asignado. |
| RF-18 | El encargado debe ver el estado de los lugares de su sector en tiempo real. |
| RF-19 | La ficha electrónica debe llegar al encargado **solo cuando el conductor confirma el pago** (QR) o elige efectivo, no antes. |
| RF-20 | El encargado debe poder ver el detalle de la ficha (código, lugar, monto, método, hora) para compararla con la que muestra el conductor. |
| RF-21 | El encargado debe poder marcar el sitio como **cancelado/pagado** una vez verificada la ficha. |
| RF-22 | En pagos en efectivo, el encargado debe registrar el cobro recibido antes de marcar el sitio como pagado. |
| RF-23 | El sistema debe notificar al encargado cuando llega una nueva ficha. |
| RF-24 | El encargado debe ver las fichas canceladas o expiradas de su sector. |
| RF-25 | El encargado debe poder consultar el historial de fichas del día en su sector. |

## 3. Módulo Administrador (con login)

| ID | Requerimiento |
|---|---|
| RF-26 | El sistema debe permitir el inicio y cierre de sesión del administrador. |
| RF-27 | El administrador debe poder crear, editar y desactivar sectores y sus lugares. |
| RF-28 | El administrador debe poder configurar la tarifa de parqueo por sector. |
| RF-29 | El administrador debe poder crear, editar, desactivar y restablecer la contraseña de encargados. |
| RF-30 | El administrador debe poder asignar cada encargado a un sector. |
| RF-31 | El administrador debe poder revisar todas las **cancelaciones** (por el conductor y por expiración) con fecha, hora, sector, lugar, motivo y tiempo transcurrido. |
| RF-32 | El administrador debe poder filtrar cancelaciones por fecha, sector y tipo. |
| RF-33 | El administrador debe poder ver todas las fichas y pagos, filtrando por sector, fecha y método de pago. |
| RF-34 | El administrador debe poder generar reportes de ingresos, ocupación y cobros en efectivo vs QR, con exportación a PDF/Excel. |
| RF-35 | El administrador debe poder ver el estado en tiempo real de los 40 lugares. |

## 4. Reglas de negocio del sistema

| ID | Requerimiento |
|---|---|
| RF-36 | Un lugar solo puede estar reservado por un conductor a la vez. |
| RF-37 | Una ficha tiene un código único y no puede reutilizarse una vez marcada como pagada. |
| RF-38 | Toda cancelación, expiración, cobro y cambio de estado debe quedar registrado con fecha, hora y responsable. |
| RF-39 | Si el conductor paga por QR dentro del plazo, la reserva no debe expirar durante la confirmación del pago. |
| RF-40 | El sistema debe ser capaz de agregar nuevos sectores y lugares sin modificar el código. |
