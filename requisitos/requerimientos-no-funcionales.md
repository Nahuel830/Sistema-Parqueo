# Requerimientos No Funcionales – Sistema de Parqueo Tarija

## 1. Rendimiento

| ID | Requerimiento |
|---|---|
| RNF-01 | Las pantallas principales deben cargar en menos de 3 segundos con conexión 4G. |
| RNF-02 | El cambio de estado de un lugar debe reflejarse a todos los usuarios en menos de 2 segundos. |
| RNF-03 | El sistema debe soportar al menos 200 usuarios concurrentes sin degradación notable. |
| RNF-04 | La generación del QR y de la ficha debe tomar menos de 3 segundos. |

## 2. Disponibilidad y confiabilidad

| ID | Requerimiento |
|---|---|
| RNF-05 | El sistema debe tener disponibilidad mínima del 99 % en horario de atención. |
| RNF-06 | El contador de 5 minutos debe calcularse en el servidor, no en el dispositivo del usuario. |
| RNF-07 | Ante una falla, no deben perderse pagos ni fichas ya confirmadas. |
| RNF-08 | Debe haber copias de seguridad automáticas diarias de la base de datos. |
| RNF-09 | Las operaciones críticas (reservar, pagar, cancelar) deben ser atómicas para evitar que dos conductores tomen el mismo lugar. |

## 3. Seguridad

| ID | Requerimiento |
|---|---|
| RNF-10 | Las contraseñas deben almacenarse cifradas con hash seguro (bcrypt o similar). |
| RNF-11 | Toda comunicación debe usar HTTPS. |
| RNF-12 | El acceso por roles debe estar restringido: el encargado solo accede a su sector y solo el administrador a la gestión y reportes. |
| RNF-13 | Las sesiones deben expirar tras un período de inactividad. |
| RNF-14 | El sistema debe proteger contra inyección SQL, XSS y CSRF. |
| RNF-15 | Los códigos de ficha deben ser únicos e imposibles de adivinar. |
| RNF-16 | Debe existir un registro de auditoría de acciones de encargados y administradores. |
| RNF-17 | No se almacenarán datos bancarios del conductor; el pago se delega al servicio QR. |

## 4. Usabilidad

| ID | Requerimiento |
|---|---|
| RNF-18 | La interfaz debe ser sencilla: el conductor debe poder reservar y pagar en máximo 5 pasos. |
| RNF-19 | El sistema debe estar en idioma español. |
| RNF-20 | Los estados de los lugares deben distinguirse por color y por texto/ícono (accesibilidad). |
| RNF-21 | El sistema debe ser entendible sin capacitación para el conductor; el encargado debe requerir como máximo una capacitación breve. |

## 5. Compatibilidad y portabilidad

| ID | Requerimiento |
|---|---|
| RNF-22 | La aplicación debe ser web responsiva, usable desde celular, tablet y computadora. |
| RNF-23 | Debe funcionar en las versiones recientes de Chrome, Firefox, Edge y Safari. |
| RNF-24 | La vista del conductor debe estar optimizada primero para celular (mobile-first). |

## 6. Mantenibilidad y escalabilidad

| ID | Requerimiento |
|---|---|
| RNF-25 | El código debe estar modularizado y documentado. |
| RNF-26 | El sistema debe permitir agregar más sectores y lugares sin cambios estructurales. |
| RNF-27 | El código debe versionarse en GitHub con control de ramas. |

## 7. Legales y de operación

| ID | Requerimiento |
|---|---|
| RNF-28 | El sistema debe respetar las tarifas y la normativa municipal de la Alcaldía de Tarija. |
| RNF-29 | Los registros de pagos y cancelaciones deben conservarse al menos 1 año para auditoría. |
| RNF-30 | Todas las fechas y horas deben usar la zona horaria de Bolivia (UTC−4). |
| RNF-31 | La moneda será el boliviano (Bs). |
