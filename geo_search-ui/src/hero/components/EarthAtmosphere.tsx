import React, { useMemo } from 'react';
import * as THREE from 'three';

interface EarthAtmosphereProps {
  radius?: number;
}

/**
 * Subtle Rayleigh atmospheric limb scattering.
 * Strictly adheres to:
 * - NO thick circular outline or neon border
 * - Zero blue overlay in the center (center is completely transparent)
 * - Soft, natural blue rim at the grazing edge (limb) using steep Fresnel falloff
 */
export const EarthAtmosphere: React.FC<EarthAtmosphereProps> = ({ radius = 2.45 }) => {
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float dotProduct = dot(viewDir, vNormal);
          
          // Steep grazing edge falloff: center has 0 opacity, only edge glows
          float fresnel = 1.0 - max(dotProduct, 0.0);
          float intensity = pow(fresnel, 5.5) * 0.55;
          
          // Authentic Earth atmospheric blue
          vec3 atmosphereColor = vec3(0.20, 0.68, 0.96);
          gl_FragColor = vec4(atmosphereColor, intensity);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false
    });
  }, []);

  return (
    <mesh material={shaderMaterial}>
      <sphereGeometry args={[radius, 128, 128]} />
    </mesh>
  );
};
