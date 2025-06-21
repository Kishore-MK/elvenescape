import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface EnemyProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  visible?: boolean;
  playerPosition?: THREE.Vector3;
  triggerDistance?: number;
}

const Enemy: React.FC<EnemyProps> = ({ 
  position = [0, 0, 0], 
  rotation = [0, 3, 0], 
  scale = 1,
  visible = true,
  playerPosition,
  triggerDistance = 3
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  
  const { scene, animations } = useGLTF('/assets/extra/enemy.gltf');
  const { actions, mixer } = useAnimations(animations, meshRef);
    
   

  // Enable shadows for all meshes in the model
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  // Handle animation based on player proximity
  useEffect(() => {
    if (actions['PortalOpen']) {
      if (isPlayerNear) {
        actions['PortalOpen'].reset().play();
        actions['PortalOpen'].setLoop(THREE.LoopRepeat, Infinity);
      } else {
        actions['PortalOpen'].stop();
      }
    }
  }, [isPlayerNear, actions]);

  // Check distance to player and update animation mixer
  useFrame((state, delta) => {
    if (meshRef.current && playerPosition) {
      // Get the actual world position of the enemy
      const enemyWorldPosition = new THREE.Vector3();
      meshRef.current.getWorldPosition(enemyWorldPosition);
      
      // Calculate distance to player
      const distance = enemyWorldPosition.distanceTo(playerPosition);
      
      // Update isPlayerNear state based on distance
      const wasPlayerNear = isPlayerNear;
      const nowPlayerNear = distance <= triggerDistance;
      
      if (wasPlayerNear !== nowPlayerNear) {
        setIsPlayerNear(nowPlayerNear);
      }
    }
    
    // Update animation mixer
    if (mixer) {
      mixer.timeScale = 1; // Normal speed
      mixer.update(delta);
    }
  });

  if (!visible) return null;

  return (
    <group 
      ref={meshRef} 
      position={position} 
      rotation={rotation} 
      scale={scale}
    >
      <primitive object={scene} />
    </group>
  );
};

// Preload the model for better performance
useGLTF.preload('/assets/extra/enemy.gltf');

export default Enemy;