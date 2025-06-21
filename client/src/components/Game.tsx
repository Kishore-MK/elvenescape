import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./Scene";
import { AudioControls } from "./AudioManager";
interface GameProps {
  onReturnToMenu: () => void;
  audioControls: AudioControls;
}
// Main game component with canvas and camera setup
const Game: React.FC<GameProps> = ({ onReturnToMenu, audioControls }) => {
    useEffect(() => {
    // Start game music when component mounts
    audioControls.playGame();
  }, [audioControls]);
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        camera={{
          fov: 45,
          position: [0, 8, 10],
          near: 0.1,
          far: 500, // Much longer view distance
        }}
        shadows
      >
        <Scene />
      </Canvas>

      {/* UI Overlay */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "white",
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          background: "rgba(0,0,0,0.5)",
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        <div>🌲 Forest Walker</div>
        <div>Press W to move forward</div>
        <div>Use mouse to interact</div>
      <button onClick={audioControls.toggleMute}>
          {audioControls.isMuted ? "🔇" : "🔊"}
        </button>
        <button onClick={onReturnToMenu}>← Menu</button>
      </div>
    </div>
  );
};

export default Game;
