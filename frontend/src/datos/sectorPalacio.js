export const SECTOR_PALACIO = 'Palacio de Justicia';

export function esSectorPalacio(nombre) {
  return typeof nombre === 'string'
    && nombre.trim().toLowerCase() === SECTOR_PALACIO.toLowerCase();
}
