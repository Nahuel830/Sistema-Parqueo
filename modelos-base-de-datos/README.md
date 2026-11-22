# Modelos de datos del parqueo tarifado de Tarija

- [Modelo conceptual](diagrama-conceptual.svg) · [fuente PlantUML](diagrama-conceptual.puml). Los rectángulos representan entidades, los óvalos atributos y los rombos relaciones. El conductor usa el sistema de forma anónima.
- [Modelo lógico](logico-parqueo.svg) · [fuente PlantUML](logico-parqueo.puml). PK identifica la clave primaria, FK una referencia, U una clave única simple, U1 los campos de una clave única compuesta y ? un campo opcional. Las relaciones se leen en notación de pata de cuervo. El número de lugar es único **dentro de cada sector**.
- [Modelo físico PostgreSQL](modelo-fisico-postgresql.sql) · [tres vistas editables en draw.io](modelos-bd-sistema-parqueo.drawio).

El SQL instala en una base vacía las mismas diez tablas, columnas, restricciones, índices y datos iniciales de `AVANCE TRÍO B/backend/db/schema.sql` en `backend/sectores-lugares` (5811729). Se retiraron las órdenes de borrado del instalador y la zona horaria se configura solo para la transacción. Desde la raíz del repositorio: `psql -v ON_ERROR_STOP=1 -d nombre_de_base -f modelos-base-de-datos/modelo-fisico-postgresql.sql`. La placa opcional en reserva es un campo de compatibilidad. El flujo público permite dejarla vacía.

## Correspondencia con los requisitos funcionales

| RF | Datos y comportamiento esperado |
|---|---|
| 01–05 | Acceso público. Consultar sectores y lugares activos y sus estados LIBRE, RESERVADO y OCUPADO. Los datos iniciales crean Plaza Sucre y Palacio de Justicia con 20 lugares cada uno. La interfaz actualiza la disponibilidad. |
| 06–08, 36 | Bloquear el lugar libre y registrar reserva, importe, tarifa y vencimiento a cinco minutos en la misma transacción. El índice parcial admite una sola reserva ACTIVA por lugar. El contador usa fecha_expiracion del servidor. |
| 09–12, 19 | La interfaz presenta QR y la alternativa en efectivo. La pasarela confirma el pago QR. Elegir efectivo genera un pago PENDIENTE. En cada caso emitir ficha única y notificar al encargado del sector cuando corresponda. |
| 13–15 | Cancelar a solicitud del conductor dentro del plazo o expirar automáticamente. Registrar cancelación, liberar lugar y auditar en una transacción. El token de reserva del backend permite autorizar la consulta pública de la ficha vigente. |
| 16–18, 26–30 | El backend gestiona sesión y contraseña del personal. El rol ENCARGADO opera únicamente sobre su sector. ADMIN gestiona lugares, sectores, tarifas y asignaciones del personal. |
| 20–23, 37 | Consultar ficha con reserva, lugar, sector y pago. En efectivo registrar el cobro y al encargado antes de marcar pagado. Al verificar, comprobar sector y estado previo, registrar responsable y pasar el lugar a OCUPADO. Repetir la petición debe producir una sola transición. |
| 24–25, 31–32 | El historial de sector se obtiene por reserva → lugar → sector. Usar unión externa con ficha para incluir cancelaciones y expiraciones previas a la emisión. Cancelación conserva fecha, tipo, motivo y segundos transcurridos. |
| 33–35 | Filtrar pagos y fichas por fecha, método y sector. Sumar solo pagos CONFIRMADOS para reportes de ingresos. La ocupación se consulta en lugar. El backend exporta los reportes a PDF o Excel y publica los cambios de estado. |
| 38 | Registrar cancelación, expiración, cobro y cada transición en bitacora con acción, estados, fecha y responsable. Para eventos anónimos o automáticos el usuario es nulo y la acción debe distinguir CONDUCTOR de SISTEMA. |
| 39 | El backend de pagos y el proceso de expiración deben coordinarse sobre el mismo lugar y reserva. La protección del QR en confirmación requiere el acuerdo indicado abajo. |
| 40 | Incorporar sectores, lugares y tarifas mediante datos. Los dos sectores iniciales son datos de arranque. |

## Puntos para acordar con el Trío B

1. **QR pagado antes del vencimiento (RF-39).** En la rama de reservas (082f870), el proceso expira reservas ACTIVAS por fecha. PENDIENTE por sí solo no distingue un QR recién mostrado de un pago iniciado en plazo y reconocido por la pasarela. Propuesta: conservar referencia y hora verificable de la pasarela, distinguir la confirmación en curso y hacer que el proceso de vencimiento consulte esa evidencia bajo el mismo bloqueo. Definir conciliación y reintento ante notificaciones tardías o repetidas.
2. **Efectivo y vencimiento (RF-12, 19, 22).** Elegir efectivo emite la ficha. El importe entra en ingresos al registrarse el cobro. Acordar cómo proteger una ficha ya emitida pendiente de verificación del proceso que expira reservas y cuánto tiempo puede esperar al encargado.
3. **Integridad y trazabilidad.** Las FK de ficha a pago y reserva por separado permiten referencias incongruentes. Validar que el pago corresponda a esa reserva y que el encargado pertenezca al sector. Considerar una FK compuesta y unicidad de notificación por ficha y destinatario. Acordar un origen explícito en bitácora para eventos sin usuario.
4. **Puesta en marcha.** El script inicial crea lugares pero no tarifas ni usuarios. El equipo debe cargar la tarifa aprobada y provisionar las credenciales del administrador y los encargados antes de probar el flujo. Mantener total_lugares sincronizado al editar el sector o calcularlo desde lugar.
