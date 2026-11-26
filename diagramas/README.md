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
- Los archivos `01` y `02` son los diagramas del Trío B (casos de uso y flujos); los de `base-de-datos/` son los modelos del Trío A.
- El diagrama de arquitectura muestra el sistema completo, incluido el panel del administrador de la API.
- El panel del encargado (fichas y salidas) y el del administrador (auditoría, sectores y lugares, reportes) forman parte del frontend.
