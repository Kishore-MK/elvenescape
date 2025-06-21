import React, { useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Track from "./Track";
import Player from "./Player";
import CameraController from "./CameraController";
import Shrine from "./Shrine";
import Enemy from "./Enemy";
import { useMovement } from "../hooks/useMovement";
import Entities from "./Entities";

interface GameState {
  health: number;
  ego: number;
  steps: number;
  inventory: {
    crystals: number;
    artifacts: number;
  };
}

interface SceneProps {
  gameState: GameState;
  onDamage: (amount: number) => void;
  onKillReward: (egoAmount: number) => void;
  onStep: () => void;
}

// Main scene component
const Scene: React.FC<SceneProps> = ({ 
  gameState, 
  onDamage, 
  onKillReward, 
  onStep 
}) => {
  const { position } = useMovement(5);
  const { gl } = useThree();
  
  // Separate visibility states for shrine and enemy
  const [showShrine, setShowShrine] = useState(true);
  const [showEnemy, setShowEnemy] = useState(true);
  
  // Enable shadow mapping on the renderer
  React.useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
  }, [gl]);

  return (
    <>
      {/* Lighting setup */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={2048}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
      />
      {/* Optional: Additional fill light for better visibility */}
      <directionalLight
        position={[-10, 20, -10]}
        intensity={0.3}
        color="#ffffff"
      />

      {/* Environment */}
      <fog attach="fog" args={["#4a5d23", 20, 120]} />
      <color attach="background" args={["#87CEEB"]} />

      {/* Camera follows player */}
      <CameraController target={position} />

      {/* Scene elements */}
      <Track />
      <Player 
        onStep={onStep}
        health={gameState.health}
      />
      <Entities 
        shrineCount={3} 
        enemyCount={5} 
        spawnAreaStart={30} 
        spawnAreaEnd={300}
        onDamage={onDamage}
        onKillReward={onKillReward}
        damagePerSecond={10}
      />
    </>
  );
};

export default Scene;