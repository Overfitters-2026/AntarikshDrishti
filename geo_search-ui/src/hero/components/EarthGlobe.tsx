import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { EarthAtmosphere } from './EarthAtmosphere';
import { EarthClouds } from './EarthClouds';

interface EarthGlobeProps {
  radius?: number;
  rotationSpeed?: number;
}

/**
 * True 3D Spherical Earth Globe with authentic satellite day map.
 * - Texture: /assets/earth/earth_day.jpg
 * - Continuous, uninterrupted eastward rotation (decoupled from scroll)
 * - MeshStandardMaterial with natural roughness (0.85) and zero metalness
 * - Realistic Sun lighting response with no overexposure or white overlays
 */
export const EarthGlobe: React.FC<EarthGlobeProps> = ({ 
  radius = 2.4, 
  rotationSpeed = 0.025 
}) => {
  const earthGroupRef = useRef<THREE.Group>(null);

  // Load the authentic equirectangular satellite Earth day texture
  const earthTexture = useTexture(
    '/assets/earth/earth_day.jpg',
    (texture) => {
      if (texture instanceof THREE.Texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 16;
      }
    }
  );

  if (earthTexture) {
    earthTexture.colorSpace = THREE.SRGBColorSpace;
  }

  // Continuous independent eastward rotation
  // The Earth rotates continuously forever, independent of scroll position
  useFrame((_, delta) => {
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  return (
    <group ref={earthGroupRef} rotation={[0.22, 1.45, 0]}>
      {/* Real 3D Spherical Earth with True Satellite Texture */}
      <mesh>
        <sphereGeometry args={[radius, 128, 128]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.85}
          metalness={0.0}
        />
      </mesh>

      {/* Cloud layer: Disabled unless real NASA earth_clouds.png is present */}
      <EarthClouds radius={radius * 1.008} />

      {/* Subtle atmospheric Rayleigh limb scattering */}
      <EarthAtmosphere radius={radius * 1.02} />
    </group>
  );
};

// Preload texture immediately so it is decode-ready for WebGL
useTexture.preload('/assets/earth/earth_day.jpg');
