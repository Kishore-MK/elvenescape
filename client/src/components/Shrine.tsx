import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Mock external function - replace with your actual import
// import { activateShrine } from './gameState'; // Your actual import
const activateShrine = (shrineId: string | number) => {
  console.log(`Shrine ${shrineId} activated!`);
  // Update game state, unlock abilities, play sound, etc.
};

interface ShrineProps { 
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  visible?: boolean;
  playerPosition?: THREE.Vector3;
  triggerDistance?: 3;
}

const Shrine: React.FC<ShrineProps> = ({  
  position = [0, 0, 0], 
  rotation = [0, 9, 0], 
  scale = 0.6,
  visible = true,
  playerPosition,
  triggerDistance = 4
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const playerWorldPosition = useRef(new THREE.Vector3());
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);

  const { scene } = useGLTF('/assets/extra/shrine.gltf');

  // Clone the scene to avoid issues with multiple instances
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Enable shadows for all meshes in the model
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  // Handle keyboard input for activation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'e' || event.key === 'E') {
        if (showInteraction && !isActivated) {
          handleActivate();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showInteraction, isActivated]);

  const handleActivate = () => {
    if (isActivated) return; // Prevent multiple activations
    
    setIsActivated(true);
    setShowInteraction(false);
    
    // Call the external function directly
    activateShrine("id");
  };

  // Add subtle floating animation, glow effects, and distance-based visibility
  useFrame((state) => {
    if (groupRef.current) {
      // Floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      
      // Distance-based visibility and interaction
      if (playerPosition) {
        groupRef.current.getWorldPosition(playerWorldPosition.current);
        const distance = playerWorldPosition.current.distanceTo(playerPosition);
        
        // Update visibility based on distance (7 steps)
        groupRef.current.visible = visible && distance <= 7;
        
        // Update isPlayerNear state based on trigger distance
        const wasPlayerNear = isPlayerNear;
        const nowPlayerNear = distance <= triggerDistance;
        
        if (wasPlayerNear !== nowPlayerNear) {
          setIsPlayerNear(nowPlayerNear);
          setShowInteraction(nowPlayerNear && !isActivated);
        }
      } else {
        // If no player position, use the visible prop
        groupRef.current.visible = visible;
        setShowInteraction(false);
      }
    }

    // Animate glow effect
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      
      if (isActivated) {
        // Activated state - bright golden glow
        const intensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        material.opacity = intensity;
        material.color.setHex(0xffd700); // Gold color
      } else if (isPlayerNear) {
        // Player nearby - pulsing blue glow
        const intensity = 0.4 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        material.opacity = intensity;
        material.color.setHex(0x00aaff); // Blue color
      } else {
        // Default state - subtle white glow
        const intensity = 0.2 + Math.sin(state.clock.elapsedTime * 1) * 0.1;
        material.opacity = intensity;
        material.color.setHex(0xffffff); // White color
      }
      
      // Scale glow effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.setScalar(scale);
    }
  });

  // Use effect to handle popup outside of Three.js context
  useEffect(() => {
    if (showInteraction && !isActivated) {
      // Create popup element
      const popup = document.createElement('div');
      popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-5 py-2 rounded-lg border-2 border-blue-400 text-base font-bold z-50 flex items-center gap-2';
      popup.innerHTML = `
        <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        Press E to Activate Shrine
      `;
      popup.id = 'shrine-interaction-popup';
      
      document.body.appendChild(popup);
      
      return () => {
        const existingPopup = document.getElementById('shrine-interaction-popup');
        if (existingPopup) {
          document.body.removeChild(existingPopup);
        }
      };
    }
  }, [showInteraction, isActivated]);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* Main shrine model */}
      <primitive object={clonedScene} />
      
      {/* Glow effect */}
      <mesh ref={glowRef} position={[0, 0.84, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial 
          color={0xffffff}
          transparent={true}
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

// Mock usage example:
/*
<Shrine id="shrine_1" position={[10, 0, 10]} />
<Shrine id="shrine_2" position={[-10, 0, 10]} />

// Your actual gameState.js file would export:
export const activateShrine = (shrineId) => {
  // Update global state, unlock abilities, etc.
  gameState.activatedShrines.add(shrineId);
  gameState.playerAbilities.push('new_power');
  playActivationSound();
  spawnMagicParticles();
};
*/

// Preload the model for better performance
useGLTF.preload('/assets/extra/shrine.gltf');

export default Shrine;