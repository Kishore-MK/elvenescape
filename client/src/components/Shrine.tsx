import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ShrineProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  visible?: boolean;
}

const Shrine: React.FC<ShrineProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 9, 0], 
  scale = 1,
  visible = true 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/assets/extra/shrine.gltf');

  // Clone the scene to avoid issues with multiple instances
  const clonedScene = scene.clone();

  // Enable shadows for all meshes in the model
  React.useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  // Optional: Add subtle floating animation
  useFrame((state) => {
    if (groupRef.current && visible) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
};

// Preload the model for better performance
useGLTF.preload('/assets/extra/shrine.gltf');

export default Shrine;