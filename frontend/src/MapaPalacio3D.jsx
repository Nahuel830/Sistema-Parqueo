import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import lugaresPalacio from './datos/lugaresPalacio.json';

const RUTA_MODELO = '/modelos/palacio-justicia.glb';

function soportaWebGL() {
  try {
    const lienzo = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext
      && (lienzo.getContext('webgl2') || lienzo.getContext('webgl')));
  } catch {
    return false;
  }
}

function texturaNumero(numero) {
  const tamano = 256;
  const lienzo = document.createElement('canvas');
  lienzo.width = tamano;
  lienzo.height = tamano;
  const ctx = lienzo.getContext('2d');
  ctx.clearRect(0, 0, tamano, tamano);
  ctx.beginPath();
  ctx.arc(tamano / 2, tamano / 2, tamano * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#ff4d4f';
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 128px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(numero), tamano / 2, tamano / 2 + 6);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

class LimiteErrorModelo extends Component {
  constructor(props) {
    super(props);
    this.state = { conError: false };
  }

  static getDerivedStateFromError() {
    return { conError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.conError ? null : this.props.children;
  }
}

function Modelo({ onListo }) {
  const { scene } = useGLTF(RUTA_MODELO);
  const modelo = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    onListo();
  }, [onListo]);

  return <primitive object={modelo} />;
}

function Marcador({ lugar, numero }) {
  const anillo = useRef(null);
  const textura = useMemo(() => texturaNumero(numero), [numero]);

  useEffect(() => () => textura.dispose(), [textura]);

  useFrame((estado) => {
    if (!anillo.current) return;
    const pulso = 1 + Math.sin(estado.clock.getElapsedTime() * 3) * 0.12;
    anillo.current.scale.setScalar(pulso);
  });

  return (
    <group position={[lugar.x, lugar.y + 0.05, lugar.z]} rotation={[0, THREE.MathUtils.degToRad(lugar.rot || 0), 0]}>
      <mesh ref={anillo} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.1, 64]} />
        <meshBasicMaterial color="#ffd166" transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.3, 48]} />
        <meshBasicMaterial color="#ff4d4f" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 6.4, 12]} />
        <meshBasicMaterial color="#ff4d4f" transparent opacity={0.85} />
      </mesh>
      <sprite position={[0, 7.2, 0]} scale={[4.4, 4.4, 1]}>
        <spriteMaterial map={textura} transparent depthTest={false} />
      </sprite>
    </group>
  );
}

function Enfoque({ lugar }) {
  const { camera, controls } = useThree();
  const objetivo = useRef(new THREE.Vector3(0, 0, 0));
  const camaraDeseada = useRef(new THREE.Vector3(0, 85, 70));
  const restante = useRef(0);

  useEffect(() => {
    if (!lugar) {
      objetivo.current.set(0, 0, 0);
      camaraDeseada.current.set(0, 85, 70);
    } else {
      objetivo.current.set(lugar.x, lugar.y, lugar.z);
      camaraDeseada.current.set(lugar.x, lugar.y + 56, lugar.z + 24);
    }
    restante.current = 1.1;
  }, [lugar]);

  useFrame((_, delta) => {
    if (restante.current <= 0 || !controls) return;
    const paso = 1 - Math.pow(0.0001, delta);
    controls.target.lerp(objetivo.current, paso);
    camera.position.lerp(camaraDeseada.current, paso);
    controls.update();
    restante.current -= delta;
  });

  return null;
}

function Escena({ lugar, numero, onListo }) {
  const controles = useRef(null);

  return (
    <>
      <color attach="background" args={['#0b1220']} />
      <hemisphereLight args={['#ffffff', '#334155', 0.7]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[40, 60, 25]} intensity={1.15} />
      <directionalLight position={[-40, 40, -30]} intensity={0.4} />
      <Suspense fallback={null}>
        <Modelo onListo={onListo} />
      </Suspense>
      {lugar && <Marcador lugar={lugar} numero={numero} />}
      <OrbitControls
        ref={controles}
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={12}
        maxDistance={180}
        maxPolarAngle={Math.PI / 2.05}
      />
      <Enfoque lugar={lugar} />
    </>
  );
}

function Respaldo2D({ numero }) {
  const valores = Object.values(lugaresPalacio);
  const xs = valores.map((l) => l.x);
  const zs = valores.map((l) => l.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const ancho = maxX - minX || 1;
  const alto = maxZ - minZ || 1;

  return (
    <div className="mapa3d__respaldo" role="img" aria-label={numero ? `Plano 2D: tu lugar es el ${numero}` : 'Plano 2D del Palacio de Justicia'}>
      <p className="mapa3d__respaldo-titulo">Plano 2D (tu navegador no soporta WebGL)</p>
      <div className="mapa3d__respaldo-plano">
        {Object.entries(lugaresPalacio).map(([clave, lugar]) => {
          const izquierda = ((lugar.x - minX) / ancho) * 100;
          const arriba = ((lugar.z - minZ) / alto) * 100;
          const activo = String(clave) === String(numero);
          return (
            <span
              key={clave}
              className="mapa3d__respaldo-lugar"
              data-activo={activo}
              style={{ left: `${izquierda}%`, top: `${arriba}%` }}
            >
              {clave}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function MapaPalacio3D({ lugarNumero, alto = 340 }) {
  const [estado, setEstado] = useState('cargando');
  const [webgl] = useState(soportaWebGL);
  const alListo = useCallback(() => setEstado('listo'), []);
  const numero = Number(lugarNumero);
  const lugar = Number.isFinite(numero) ? lugaresPalacio[String(numero)] : null;

  if (!webgl) {
    return (
      <div className="mapa3d">
        <Respaldo2D numero={numero} />
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className="mapa3d">
        <p className="mapa3d__error" role="status">
          No se pudo cargar el modelo 3D del Palacio de Justicia.
        </p>
        <Respaldo2D numero={numero} />
      </div>
    );
  }

  return (
    <div className="mapa3d">
      {lugar && <p className="mapa3d__leyenda">Tu lugar: <strong>{String(numero).padStart(2, '0')}</strong></p>}
      <div className="mapa3d__canvas" style={{ height: alto }}>
        <LimiteErrorModelo onError={() => setEstado('error')}>
          <Canvas
            camera={{ position: [0, 85, 70], fov: 45, near: 0.1, far: 1000 }}
            dpr={[1, 2]}
            gl={{ antialias: true }}
          >
            <LimiteErrorModelo onError={() => setEstado('error')}>
              <Escena lugar={lugar} numero={numero} onListo={alListo} />
            </LimiteErrorModelo>
          </Canvas>
        </LimiteErrorModelo>
        {estado === 'cargando' && (
          <div className="mapa3d__cargando" role="status">Cargando modelo 3D…</div>
        )}
      </div>
      <p className="mapa3d__ayuda">Arrastra para girar · rueda o pinza para acercar</p>
    </div>
  );
}

useGLTF.preload(RUTA_MODELO);
