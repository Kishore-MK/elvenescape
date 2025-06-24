import React, { useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./Scene";
import GameUI from "./GameUI";
import { AudioControls } from "./AudioManager";
import { useStepForward } from "../dojo/hooks/useStepForward";
import useAppStore, { GamePhase } from "../zustand/store";
import { useTakeDamage } from "../dojo/hooks/useGameActions";
import { useSpawnPlayer } from "../dojo/hooks/useSpawn";

interface GameProps {
  onReturnToMenu: () => void;
  audioControls: AudioControls;
}

// Main game component with canvas and camera setup
const Game: React.FC<GameProps> = ({ onReturnToMenu, audioControls }) => {
  const { playerExists, spawnPlayer } = useSpawnPlayer();
  const takeDamage = useTakeDamage();
  const { gamePhase, player, stepCount, health, inventory } = useAppStore();
  const currentHealth = Number(health?.current);
  const ego = Number(player?.ego);
  const steps = Number(stepCount?.count);

  const stepForward = useStepForward();
  // Key to force Scene component re-render on restart
  const [sceneKey, setSceneKey] = React.useState(0);

  useEffect(() => {
    // Start game music when component mounts
    audioControls.playGame();
    // Reset game state when component mounts

    // Reset scene key to force fresh scene
    setSceneKey((prev) => prev + 1);
  }, [audioControls]);

  // Handle player taking damage
  const handlePlayerDamage = (damage: number) => {
    takeDamage.takeDamage(damage);
  };

  // Handle step counting
  const handleStep = async () => {
    try {
      if (gamePhase === GamePhase.WALKING) {
        console.log(
          `game phase is ${gamePhase}`
        );
        // Check if execution is allowed
        if (!stepForward.canExecute) {
          throw new Error("Step execution is not currently allowed");
        }

        if (stepForward.state.status === "pending") {
          console.warn("Step execution already in progress");
          return;
        }

        await stepForward.execute();

        if (stepForward.state.status === "success") {
          console.log("Step executed successfully:", stepForward.state.txHash);
        }
      } else {
        console.log(
          `Cannot take step - game phase is ${gamePhase}, must be WALKING`
        );
        return;
      }
    } catch (error) {
      console.error("Error executing step:", error);
      console.error("Unexpected error:", stepForward.state.error);
    }
  };

  // Handle restarting the game from the beginning
  const handlePlayAgain = useCallback(async () => {
    // Spawn player first
    try {
      console.log("Restaring");

      await spawnPlayer();

      // Restart game music to ensure fresh start
      audioControls.playGame();
      // Force Scene component to completely re-render by changing its key
      setSceneKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error spawning player:", error);
    }
  }, [player, playerExists, spawnPlayer]);

  return (
    <div className="w-screen h-screen relative">
      <Canvas
        camera={{
          fov: 45,
          position: [0, 8, 10],
          near: 0.1,
          far: 500, // Much longer view distance
        }}
        shadows
      >
        <Scene
          key={sceneKey}
          gameState={{
            currentHealth,
            ego,
            steps,
            inventory,
          }}
          onDamage={handlePlayerDamage}
          onStep={handleStep}
        />
      </Canvas>

      {/* Game UI Overlay */}
      <GameUI />

     {/* Game Controls UI */}
<div className="absolute bottom-5 right-5 text-white font-sans text-sm bg-black bg-opacity-50 p-3 rounded-lg border border-white border-opacity-30 hidden sm:block">
  <div className="mb-2 font-bold">How to play?</div>
  <div className="mb-1">W: Move</div>
  <div className="mb-1">
    E: Attack enemy /<br />
    Activate Shrine
  </div>
  <div className="flex gap-2">
    <button
      onClick={audioControls.toggleMute}
      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors pointer-events-auto"
    >
      {audioControls.isMuted ? "🔇" : "🔊"}
    </button>
    <button
      onClick={onReturnToMenu}
      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors pointer-events-auto"
    >
      ← Menu
    </button>
  </div>
</div>
      {/* Game Over Overlay */}
      {currentHealth <= 0 && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4 text-red-500">How did you die? Greed? Maybe!</h2>
            <p className="text-xl mb-2">Final Stats:</p>
            <p className="mb-1">Steps: {steps.toLocaleString()}</p>
            <p className="mb-1">Ego: {ego}</p>
            {/* <p className="mb-1">Crystals: {inventory.crystals}</p>
            <p className="mb-4">Artifacts: {inventory.artifacts}</p> */}
            {/* <button
              onClick={handlePlayAgain}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold mr-4 transition-colors"
            >
              Play Again
            </button> */}
            <button
  onClick={onReturnToMenu}
  onTouchEnd={(e) => {
    e.stopPropagation();
    onReturnToMenu();
  }}
  onTouchStart={(e) => e.stopPropagation()}
  style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold transition-colors"
>
  Play Again
</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
