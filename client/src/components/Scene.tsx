import React from "react"; 
import {  useThree } from "@react-three/fiber";
import * as THREE from "three";
import Track from "./Track";
import Player from "./Player";
import CameraController from "./CameraController"; 
import { useMovement } from "../hooks/useMovement";
import Entities from "./Entities";
import { Inventory } from "../dojo/bindings";

interface GameState {
  currentHealth: number;
  ego: number;
  steps: number;
  inventory: Inventory | null;
}

interface SceneProps {
  gameState: GameState;
  onDamage: (amount: number) => void; 
  onStep: () => void; 
}



// Main scene component
const Scene: React.FC<SceneProps> = ({ 
  gameState, 
  onDamage,  
  onStep, 
}) => {
  const { position } = useMovement(5);
  const { gl } = useThree();
 
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
        health={gameState.currentHealth}
      />
       <Entities
    shrineCount={7}
    enemyCount={15}
    spawnAreaStart={-100}
    spawnAreaEnd={800}
    onDamage={onDamage}  
    damagePerSecond={10}
  />
    </>
  );
};

export default Scene;