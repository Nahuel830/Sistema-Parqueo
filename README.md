# Sistema de Parqueo – Tarija, Bolivia

Sistema web para consultar, reservar y pagar espacios de parqueo tarifado en sectores de la ciudad de Tarija donde cobra la Alcaldía.

## Descripción

El conductor (sin necesidad de login) ingresa al sistema, elige un sector, ve en tiempo real qué lugares están libres, selecciona uno y lo paga por **QR** o en **efectivo**. El pago genera una **ficha electrónica** que le llega al **encargado del sector**, quien la verifica físicamente con el conductor. El lugar se reserva por **5 minutos** para evitar cobros irregulares y el conductor puede cancelar dentro de ese lapso. El administrador audita las cancelaciones.

## Alcance inicial

| Sector | Lugares |
|---|---|
| Plaza Sucre | 20 |
| Palacio de Justicia | 20 |
| **Total** | **40** |

## Actores

- **Conductor** (público, sin login)
- **Encargado de sector** (con login)
- **Administrador** (con login)

## Flujo resumido

1. El conductor elige sector y lugar libre.
2. El lugar queda reservado 5 minutos.
3. El conductor elige pago por QR o efectivo.
4. Al confirmar el pago, la ficha electrónica llega al encargado del sector.
5. El conductor llega al lugar y muestra la ficha; el encargado la verifica y marca el sitio como **cancelado/pagado**.
6. Si el conductor ya no lo quiere, cancela dentro de los 5 minutos; si no llega a tiempo, la reserva expira y el lugar se libera.
7. El administrador revisa cancelaciones y expiraciones.

## Documentación

Cada documento se encuentra en su propia rama:

| Documento | Rama | Archivo |
|---|---|---|
| Requerimientos funcionales | `requerimientos-funcionales` | `docs/requerimientos-funcionales.md` |
| Requerimientos no funcionales | `requerimientos-no-funcionales` | `docs/requerimientos-no-funcionales.md` |
| Actores | `actores` | `docs/actores.md` |

## Nombres  
Nahuel Fernando Martinez Mariscal
Jose Manuel Huarachi Colque
Xavier Castrillo
Jorge Villa Rubia
Rodrigo Porcel
