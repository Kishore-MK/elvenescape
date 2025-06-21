import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./Scene";
import GameUI from "./GameUI";
import { useGameState } from "../hooks/useGameState";
import { AudioControls } from "./AudioManager";

interface GameProps {
  onReturnToMenu: () => void;
  audioControls: AudioControls;
}

// Main game component with canvas and camera setup
const Game: React.FC<GameProps> = ({ onReturnToMenu, audioControls }) => {
  const {
    health,
    ego,
    steps,
    inventory,
    takeDamage,
    addEgo,
    addStep,
    addItem,
    resetGame
  } = useGameState();

  // Key to force Scene component re-render on restart
  const [sceneKey, setSceneKey] = React.useState(0);

  useEffect(() => {
    // Start game music when component mounts
    audioControls.playGame();
    // Reset game state when component mounts
    resetGame();
    // Reset scene key to force fresh scene
    setSceneKey(prev => prev + 1);
  }, [audioControls, resetGame]);

  // Handle enemy kill - add ego and maybe items
  const handleEnemyKilled = (egoAmount: number) => {
    addEgo(egoAmount);
    
    // Random chance to get items
    if (Math.random() < 0.3) { // 30% chance for crystal
      addItem('crystals', 1);
    }
    if (Math.random() < 0.1) { // 10% chance for artifact
      addItem('artifacts', 1);
    }
  };

  // Handle player taking damage
  const handlePlayerDamage = (damage: number) => {
    takeDamage(damage);
  };

  // Handle step counting
  const handleStep = () => {
    addStep();
  };

  // Handle restarting the game from the beginning
  const handlePlayAgain = () => {
    resetGame();
    // Restart game music to ensure fresh start
    audioControls.playGame();
    // Force Scene component to completely re-render by changing its key
    setSceneKey(prev => prev + 1);
  };

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
          key={sceneKey} // This forces complete re-render on restart
          gameState={{
            health,
            ego,
            steps,
            inventory
          }}
          onDamage={handlePlayerDamage}
          onKillReward={handleEnemyKilled}
          onStep={handleStep}
        />
      </Canvas>

      {/* Game UI Overlay */}
      <GameUI
        health={health}
        ego={ego}
        steps={steps}
        inventory={inventory}
      />

      {/* Game Controls UI */}
      <div className="absolute top-5 right-5 text-white font-sans text-sm bg-black bg-opacity-50 p-3 rounded-lg border border-white border-opacity-30">
        <div className="mb-2 font-bold">Fog Walker</div>
        <div className="mb-1">W: Move</div>
        <div className="mb-1">E: Attack enemy /<br/>Activate Shrine</div>
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
      {health <= 0 && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4 text-red-500">Game Over</h2>
            <p className="text-xl mb-2">Final Stats:</p>
            <p className="mb-1">Steps: {steps.toLocaleString()}</p>
            <p className="mb-1">Ego: {ego}</p>
            <p className="mb-1">Crystals: {inventory.crystals}</p>
            <p className="mb-4">Artifacts: {inventory.artifacts}</p>
            <button
              onClick={handlePlayAgain}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold mr-4 transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={onReturnToMenu}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold transition-colors"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;