import React, { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useAttackGatekeeper } from "../dojo/hooks/useGameActions";
import { usePlayerStats } from "../dojo/hooks/usePlayerStats";
import useAppStore, { GamePhase } from "../zustand/store";

interface EnemyProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  visible?: boolean;
  playerPosition?: THREE.Vector3;
  triggerDistance?: number;
  onDamage?: (amount: number) => void;
  damagePerSecond?: number;
}

const Enemy: React.FC<EnemyProps> = ({
  position = [0, 0, 0],
  rotation = [0, 3.1, 0],
  scale = 1,
  visible = true,
  playerPosition,
  triggerDistance = 3,
  onDamage,
  damagePerSecond = 10,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const enemyWorldPosition = useRef(new THREE.Vector3());
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const damageTimer = useRef(0);
  const { setGamePhase } = useAppStore();
  const { refetch } = usePlayerStats();
  const { scene, animations } = useGLTF("/assets/extra/enemy.gltf");

  // Clone the scene properly for animations and materials
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);

    // Clone materials to ensure each enemy has unique materials
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat) => mat.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    return cloned;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, clonedScene);
  const attackGatekeeper = useAttackGatekeeper();

  // Enable shadows for all meshes in the cloned model
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  // Handle animation based on player proximity and death state
  useEffect(() => {
    if (actions && actions["PortalOpen"]) {
      if (isDead) {
        actions["PortalOpen"].stop();
      } else if (isPlayerNear) {
        actions["PortalOpen"].reset().play();
        actions["PortalOpen"].setLoop(THREE.LoopRepeat, Infinity);
      } else {
        actions["PortalOpen"].stop();
      }
    }
  }, [isPlayerNear, isDead, actions]);

  // Handle keyboard input for attack
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "e" || event.key === "E") {
        if (showInteraction && !isDead && !isAttacking) {
          handleAttack();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showInteraction, isDead, isAttacking]);

  const handleAttack = async () => {
    setIsAttacking(true);
    setGamePhase(GamePhase.FIGHTING_GATEKEEPER);

    try {
      await attackGatekeeper.attackGatekeeper();
      console.log(`Enemy killed! +15 ego`);
      setIsDead(true);
      setShowInteraction(false);
      // Wait 5 seconds for the gold transition to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await refetch();
      setGamePhase(GamePhase.WALKING);
    } finally {
      setIsAttacking(false);
    }
  };

  // Apply fade opacity to all materials
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              mat.transparent = true;
              mat.opacity = fadeOpacity;
            });
          } else {
            child.material.transparent = true;
            child.material.opacity = fadeOpacity;
          }
        }
      });
    }
  }, [fadeOpacity]);

  // Check distance to player and update animation mixer
  useFrame((state, delta) => {
    // Handle smooth fade out when dead
    if (isDead && fadeOpacity > 0) {
      const newOpacity = Math.max(0, fadeOpacity - delta * 2); // 0.5 second fade
      setFadeOpacity(newOpacity);

      // Hide completely when fully faded
      if (newOpacity <= 0 && groupRef.current) {
        groupRef.current.visible = false;
      }
    }

    if (groupRef.current && playerPosition && !isDead) {
      // Get the actual world position of the enemy
      groupRef.current.getWorldPosition(enemyWorldPosition.current);

      // Calculate distance to player
      const distance = enemyWorldPosition.current.distanceTo(playerPosition);

      // Update visibility based on distance (7 steps)
      groupRef.current.visible = visible && distance <= 7;

      // Update isPlayerNear state based on trigger distance
      const wasPlayerNear = isPlayerNear;
      const nowPlayerNear = distance <= triggerDistance;

      if (wasPlayerNear !== nowPlayerNear) {
        setIsPlayerNear(nowPlayerNear);
        setShowInteraction(nowPlayerNear);

        // Reset damage timer when player enters/leaves range
        damageTimer.current = 0;
      }

      // Deal continuous damage when player is near
      if (isPlayerNear && onDamage) {
        damageTimer.current += delta;

        // Deal damage every second
        if (damageTimer.current >= 1.0) {
          onDamage(damagePerSecond);
          damageTimer.current = 0;
        }
      }
    } else if (groupRef.current && !isDead) {
      // If no player position, use the visible prop
      groupRef.current.visible = visible;
      setShowInteraction(false);
    }

    // Update animation mixer
    if (mixer && !isDead) {
      mixer.timeScale = 1;
      mixer.update(delta);
    }
  });

  // Use effect to handle popup outside of Three.js context
  useEffect(() => {
    if (showInteraction && !isDead) {
      // Create popup element
      const popup = document.createElement("div");
      popup.className =
        "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-5 py-2 rounded-lg border-2 border-white text-base font-bold z-40 flex items-center gap-2";
      popup.innerHTML = `
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        ${isAttacking ? 'Attacking...' : 'Press E to Attack'}
      `;
      popup.id = "enemy-interaction-popup";

      document.body.appendChild(popup);

      return () => {
        const existingPopup = document.getElementById(
          "enemy-interaction-popup"
        );
        if (existingPopup) {
          document.body.removeChild(existingPopup);
        }
      };
    }
  }, [showInteraction, isDead, isAttacking]);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
};

 

// Preload the model for better performance
useGLTF.preload("/assets/extra/enemy.gltf");

export default Enemy;