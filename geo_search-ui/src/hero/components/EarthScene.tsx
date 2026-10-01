import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, MotionValue } from 'motion/react';
import * as THREE from 'three';
import { EarthGlobe } from './EarthGlobe';

interface EarthSceneProps {
  scaleValue?: MotionValue<number>;
  xValue?: MotionValue<number>;
  yValue?: MotionValue<number>;
  opacityValue?: MotionValue<number>;
}

/**
 * Internal scene controller updating group position and scale on the GPU render loop.
 */
const SceneController: React.FC<{
  scaleValue?: MotionValue<number>;
  xValue?: MotionValue<number>;
  yValue?: MotionValue<number>;
}> = ({ scaleValue, xValue, yValue }) => {
  const transformGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!transformGroupRef.current) return;

    const s = scaleValue ? scaleValue.get() : 1.15;
    const x = xValue ? xValue.get() : 0;
    const y = yValue ? yValue.get() : 0;

    transformGroupRef.current.scale.set(s, s, s);
    transformGroupRef.current.position.x = x;
    transformGroupRef.current.position.y = y;
  });

  return (
    <group ref={transformGroupRef}>
      <EarthGlobe radius={2.4} rotationSpeed={0.025} />
    </group>
  );
};

/**
 * Subtle Background Stars Geometry (strictly behind Earth)
 */
const BackgroundStars: React.FC = () => {
  const points = React.useMemo(() => {
    const coords = new Float32Array(350 * 3);
    for (let i = 0; i < 350 * 3; i += 3) {
      coords[i] = (Math.random() - 0.5) * 70;
      coords[i + 1] = (Math.random() - 0.5) * 70;
      coords[i + 2] = -22 - Math.random() * 25; // Far behind Earth in negative Z space
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(coords, 3));
    return geom;
  }, []);

  return (
    <points geometry={points}>
      <pointsMaterial
        size={0.08}
        color="#cbd5e1"
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </points>
  );
};

/**
 * Error boundary for texture loading issues
 */
class TextureErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error('EARTH TEXTURE FAILED TO LOAD at /assets/earth/earth_day.jpg:', error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Full-Screen Three.js EarthScene Component.
 * - Occupies the entire viewport (never a small rectangular box)
 * - True spherical 3D Earth with continuous eastward rotation
 * - Balanced, non-overexposed Sun lighting
 * - Zero blue outline rings or artificial circle borders
 */
export const EarthScene: React.FC<EarthSceneProps> = ({
  scaleValue,
  xValue,
  yValue,
  opacityValue
}) => {
  return (
    <motion.div
      style={opacityValue ? { opacity: opacityValue } : undefined}
      className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden"
    >
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0
        }}
        dpr={[1, 2]}
        className="w-full h-full"
      >
        {/* Moderate Natural Lighting to prevent overexposing the Earth surface */}
        <ambientLight intensity={0.25} color="#ffffff" />
        <directionalLight
          position={[-5, 3, 5]}
          intensity={1.8}
          color="#ffffff"
        />

        {/* Distant background stars */}
        <BackgroundStars />

        {/* 3D Rotating Earth Globe wrapped in Suspense and ErrorBoundary */}
        <TextureErrorBoundary>
          <Suspense fallback={null}>
            <SceneController
              scaleValue={scaleValue}
              xValue={xValue}
              yValue={yValue}
            />
          </Suspense>
        </TextureErrorBoundary>
      </Canvas>
    </motion.div>
  );
};
