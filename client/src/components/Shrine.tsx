import React, { useRef, useMemo, useState, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useInteractWithShrine } from "../dojo/hooks/useGameActions"; 
import { usePlayerStats } from "../dojo/hooks/usePlayerStats";
import useAppStore, { GamePhase } from "../zustand/store";

interface ShrineProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  visible?: boolean;
  playerPosition?: THREE.Vector3;
  triggerDistance?: number;
}

const Shrine: React.FC<ShrineProps> = ({
  position = [0, 0, 0],
  rotation = [0, 9, 0],
  scale = 0.6,
  visible = true,
  playerPosition,
  triggerDistance = 4,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const playerWorldPosition = useRef(new THREE.Vector3());
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [activationStartTime, setActivationStartTime] = useState<number | null>(null);

  const { scene } = useGLTF("/assets/extra/shrine.gltf");

  const { refetch } = usePlayerStats();
  // Clone the scene to avoid issues with multiple instances
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const {health,
    setGamePhase
  } = useAppStore();
  const interactWithShrine = useInteractWithShrine();

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
      if (event.key === "e" || event.key === "E") {
        if (showInteraction && !isActivated) {
          handleActivate();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showInteraction, isActivated]);

  const handleActivate = async () => {
    setGamePhase(GamePhase.AT_SHRINE)
    // Set loading state to disable all interactions and start timer
    setIsActivated(true);
    setShowInteraction(false);
    setActivationStartTime(Date.now());
    
    console.log("Calling activate shrine");
    await interactWithShrine.interactWithShrine(10n);
    
    // Wait 5 seconds for the gold transition to complete
    await new Promise(resolve => setTimeout(resolve, 4000));
    await refetch();
    await new Promise(resolve => setTimeout(resolve, 2000));
  if(Number(health?.current)>0){
    setGamePhase(GamePhase.WALKING);

  }
  else{
    setGamePhase(GamePhase.DEAD)
  }
    setIsActivated(false); // Reset activation state
  };

  // Add subtle floating animation, glow effects, and distance-based visibility
  useFrame((state) => {
    if (groupRef.current) {
      // Floating animation
      groupRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

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

      if (isActivated && activationStartTime) {
        // Calculate transition progress (0 to 1 over 5 seconds)
        const elapsed = Date.now() - activationStartTime;
        const transitionProgress = Math.min(elapsed / 5000, 1); // 5000ms = 5 seconds
        
        // Interpolate between blue and gold based on progress
        const startColor = new THREE.Color(0x00aaff); // Blue
        const endColor = new THREE.Color(0xffd700);   // Gold
        const currentColor = startColor.clone().lerp(endColor, transitionProgress);
        
        // Enhanced pulsing intensity during transition
        const baseIntensity = 0.6 + (transitionProgress * 0.4); // Grows from 0.6 to 1.0
        const pulseIntensity = baseIntensity + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        
        material.opacity = pulseIntensity;
        material.color.copy(currentColor);
      } else if (isPlayerNear && !isActivated) {
        // Player nearby - pulsing blue glow
        const intensity = 0.4 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        material.opacity = intensity;
        material.color.setHex(0x00aaff); // Blue color
      } else if (!isActivated) {
        // Default state - subtle white glow
        const intensity = 0.2 + Math.sin(state.clock.elapsedTime * 1) * 0.1;
        material.opacity = intensity;
        material.color.setHex(0xffffff); // White color
      }

      // Scale glow effect - more dramatic during activation
      const baseScale = isActivated ? 1.2 : 1;
      const scaleVariation = isActivated ? 0.15 : 0.1;
      const scale = baseScale + Math.sin(state.clock.elapsedTime * 2) * scaleVariation;
      glowRef.current.scale.setScalar(scale);
    }
  });

  // Handle mobile touch activation
  const handleTouchActivate = (event: TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (showInteraction && !isActivated) {
      handleActivate();
    }
  };

  // Use effect to handle popup outside of Three.js context
  useEffect(() => {
    if (showInteraction || isActivated) {
      // Create popup element
      const popup = document.createElement("div");
      
      if (isActivated) {
        popup.className =
          "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-5 py-2 rounded-lg border-2 border-yellow-400 text-base font-bold z-40 flex items-center gap-2";
        popup.innerHTML = `
          <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          Activating Shrine...
        `;
      } else {
        popup.className =
          "fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-8 py-4 rounded-full border-2 border-white text-lg font-bold z-40 flex items-center gap-3 shadow-lg cursor-pointer select-none transition-colors duration-150";
        popup.innerHTML = `
          <div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          ACTIVATE
        `;

        // Add touch event listeners for mobile
        popup.addEventListener('touchstart', handleTouchActivate, { passive: false });
        
        // Add click event for desktop fallback
        popup.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (showInteraction && !isActivated) {
            handleActivate();
          }
        });

        // Prevent text selection and context menu
        popup.addEventListener('selectstart', (e) => e.preventDefault());
        popup.addEventListener('contextmenu', (e) => e.preventDefault());
      }
      
      popup.id = "shrine-interaction-popup";
      document.body.appendChild(popup);

      return () => {
        const existingPopup = document.getElementById("shrine-interaction-popup");
        if (existingPopup) {
          if (!isActivated) {
            existingPopup.removeEventListener('touchstart', handleTouchActivate);
          }
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

// Preload the model for better performance
useGLTF.preload("/assets/extra/shrine.gltf");

export default Shrine;