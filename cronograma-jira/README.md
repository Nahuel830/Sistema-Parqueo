# Cronograma en Jira

El cronograma del proyecto (11 al 23 de noviembre de 2026) está en el tablero de Jira del equipo:

**[Tablero del proyecto PPQ – Backlog](https://josehuarachi23.atlassian.net/jira/software/c/projects/PPQ/boards/3/backlog)**

El acceso depende de los permisos de cada persona en Jira.

## Qué hay en esta carpeta
| Archivo | Para qué sirve |
|---|---|
| `cronograma.md` | Copia del cronograma con el estado de cada actividad según lo que hay en el repositorio. |
| `cronograma-importar-en-jira.csv` | Las 24 actividades listas para importar a Jira (una por equipo y día). |

El cronograma original de texto sigue en [`../cronograma.md`](../cronograma.md).

> Esta carpeta es una copia de apoyo. El tablero de Jira es el que se mantiene al día; si algo difiere, vale lo que diga Jira.

## Cómo importar el CSV en Jira
1. En Jira: **Configuración (⚙) → Sistema → Importación de sistema externo → CSV**.
2. Elegir `cronograma-importar-en-jira.csv` y el proyecto **PPQ**.
3. Formato de fecha: **yyyy-MM-dd**.
4. Asignar las columnas: `Summary` → Resumen, `Issue Type` → Tipo de incidencia, `Description` → Descripción, `Labels` (las dos) → Etiquetas, `Due date` → Fecha de vencimiento.
5. Cada actividad queda con la etiqueta del equipo (`TrioA`, `TrioB` o `Todos`) y la del área (`Documentacion`, `Base-de-datos`, `Backend`, `Frontend`, `Pruebas-y-entrega`), para filtrar el tablero.

## Para completar
- Capturas del tablero (backlog, sprint y gráfico de avance): guardarlas en esta carpeta, por ejemplo en `capturas/`.
- Los responsables por persona no van en el CSV porque Jira los asigna con cuentas de usuario; se asignan en el tablero.
