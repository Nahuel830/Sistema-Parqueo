# Diagramas del proyecto

Aquí están reunidos todos los diagramas del Sistema de Parqueo de Tarija.

| Archivo | Contenido |
|---|---|
| [`01-casos-de-uso.md`](01-casos-de-uso.md) | Actores y casos de uso, con sus requerimientos. |
| [`02-diagramas-de-flujo.md`](02-diagramas-de-flujo.md) | Flujos de reserva, pago por QR, pago en efectivo, cancelación y expiración, y la secuencia del pago QR. |
| [`03-arquitectura.md`](03-arquitectura.md) | Componentes del sistema, capas del backend y seguridad. |
| [`04-diagramas-de-estados.md`](04-diagramas-de-estados.md) | Estados de la reserva, el lugar, el pago y la ficha. |
| [`05-modelo-base-de-datos.md`](05-modelo-base-de-datos.md) | Diagrama entidad-relación y los modelos conceptual, lógico y físico. |
| [`base-de-datos/`](base-de-datos/) | Copias del modelo conceptual y lógico (SVG) y del script físico (SQL). |

## Cómo verlos
- Los archivos `.md` usan **Mermaid**: GitHub los dibuja solo al abrirlos. En otros editores se necesita una vista previa que lo admita.
- Los `.svg` se abren en cualquier navegador.

## Notas
- Los archivos `01` y `02` son copias de `AVANCE TRÍO B/docs/`; los de base de datos, de `modelos-base-de-datos/`. Si cambia el original, hay que actualizar la copia.
- El diagrama de arquitectura incluye el panel del administrador de la API. Ese código está en la rama `avance-trio-b/dia-21-login-xavier-castrillo` y todavía no llegó a `develop`.
- Las pantallas del encargado y del administrador figuran como pendientes porque no están en el repositorio.
