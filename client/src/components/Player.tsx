import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useMovement } from '../hooks/useMovement';

interface PlayerProps {
  onStep?: () => void;
  health?: number;
}

// Player component with GLB model
const Player: React.FC<PlayerProps> = ({ onStep, health = 100 }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { position, isMoving } = useMovement(5, onStep);
  const { scene, animations } = useGLTF('assets/player/elf.gltf');
  const { actions, mixer } = useAnimations(animations, meshRef);
  
  // Track previous health to detect damage
  const [prevHealth, setPrevHealth] = useState(health);
  const [showDamageEffect, setShowDamageEffect] = useState(false);

  // Detect when player takes damage
  useEffect(() => {
    if (health < prevHealth) {
      // Player took damage - show red flash
      setShowDamageEffect(true);
      
      // Remove the effect after a short time
      const timer = setTimeout(() => {
        setShowDamageEffect(false);
      }, 500); // Flash for 0.5 seconds
      
      return () => clearTimeout(timer);
    }
    setPrevHealth(health);
  }, [health, prevHealth]);

  // Handle visual effects
  useEffect(() => {
    if (meshRef.current) {
      const redIntensity = showDamageEffect ? 0.1 : 0; // Red flash only when damaged
      
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.emissive.setRGB(redIntensity, 0, 0);
              }
            });
          } else if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setRGB(redIntensity, 0, 0);
          }
        }
      });
    }
  }, [showDamageEffect]);

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
      scale={[5, 5, 5]} // Increased scale for tiny models
      rotation={[0, Math.PI/40, 0]} // Rotate clockwise 90 degrees around Y-axis
    >
      <primitive object={scene} />
    </group>
  );
};

// Preload the model for better performance
useGLTF.preload('assets/player/elf.gltf');

export default Player;