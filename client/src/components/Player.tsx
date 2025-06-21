import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useMovement } from '../hooks/useMovement';

// Player component with GLB model
const Player: React.FC = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { position, isMoving } = useMovement(5);
  
  const { scene, animations } = useGLTF('assets/player/elf.gltf');
  const { actions, mixer } = useAnimations(animations, meshRef);
   
  // Handle animation based on movement
  useEffect(() => {
   if (actions['course_chapeau']) {
  if (isMoving) {
    actions['course_chapeau'].reset().play();
    actions['course_chapeau'].setLoop(THREE.LoopRepeat, Infinity);
  } else {
    actions['course_chapeau'].stop();
  }
}
  }, [isMoving, actions]);

  // Update player position and animation mixer
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.copy(position);
      meshRef.current.position.y = 0; // Adjust based on your model's ground position
    }
    
    // Update animation mixer
    if (mixer) {
  mixer.timeScale = 1; // Normal speed
  mixer.update(delta);
}
  });

  return (
    <group 
      ref={meshRef} 
      position={[0, 0, 0]}
      scale={[5, 5, 5]}  // Increased scale for tiny models
      rotation={[0, Math.PI/40 , 0]}  // Rotate clockwise 90 degrees around Y-axis
    >
      <primitive object={scene} />
    </group>
  );
};

// Preload the model for better performance
useGLTF.preload('assets/player/elf.gltf');

export default Player;