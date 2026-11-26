import lugaresPalacio from './lugaresPalacio.json';
import lugaresPlazaSucre from './lugaresPlazaSucre.json';

// Configuración de los modelos 3D por sector.
// Para agregar otro sector: exportar su .glb a /public/modelos, generar el JSON
// de posiciones (ver blender/exportar_lugares.py) y registrarlo aquí.
// Si "lugares" está vacío, el sector no muestra visor 3D (el sistema funciona igual).
const SECTORES_3D = {
  'palacio de justicia': {
    nombre: 'Palacio de Justicia',
    glb: '/modelos/palacio-justicia.glb',
    lugares: lugaresPalacio,
    camara: { inicial: [0, 85, 70], objetivo: [0, 0, 0], enfoque: [0, 56, 24] },
    marcador: { escala: 1, sobreTodo: false },
  },
  'plaza sucre': {
    nombre: 'Plaza Sucre',
    glb: '/modelos/plaza-sucre.glb',
    lugares: lugaresPlazaSucre,
    // Sin "camara": se calcula a partir de las posiciones de los 20 lugares.
    marcador: { escala: 1, sobreTodo: true },
  },
};

function clave(nombre) {
  return typeof nombre === 'string' ? nombre.trim().toLowerCase() : '';
}

export function configSector3D(nombre) {
  const config = SECTORES_3D[clave(nombre)];
  if (!config || Object.keys(config.lugares).length === 0) return null;
  return config;
}

export function tieneModelo3D(nombre) {
  return configSector3D(nombre) !== null;
}

// Cámara por defecto cuando el sector no define una: encuadra todos los lugares.
export function camaraDe(config) {
  if (config.camara) return config.camara;
  const valores = Object.values(config.lugares);
  const xs = valores.map((l) => l.x);
  const zs = valores.map((l) => l.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const extension = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 20);
  return {
    inicial: [cx, extension * 1.1, cz + extension * 0.9],
    objetivo: [cx, 0, cz],
    enfoque: [0, extension * 0.7, extension * 0.3],
  };
}
