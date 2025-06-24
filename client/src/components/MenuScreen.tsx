import React, { useEffect, useState, useCallback } from "react";
import { AudioControls } from "./AudioManager";
import { useStarknetConnect } from "../dojo/hooks/useStarknetConnect";
import { useSpawnPlayer } from "../dojo/hooks/useSpawn";
import { useInitializePlayer } from "../dojo/hooks/useInitializePlayer";
import { usePlayer } from "../dojo/hooks/usePlayer";
import { Loader2, Wallet, Settings, UserPlus } from "lucide-react";
import useAppStore, { GamePhase } from "../zustand/store";

interface MenuScreenProps {
  onStartGame: () => void;
  audioControls: AudioControls;
}

const MenuScreen: React.FC<MenuScreenProps> = ({
  onStartGame,
  audioControls,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Starknet hooks
  const { status, address, isConnecting, handleConnect } = useStarknetConnect();

  const { player, isLoading: playerLoading, error: playerError } = usePlayer();

  const {
    isLoading: isInitializing,
    error: initError,
    initializePlayer,
  } = useInitializePlayer();

  const {
    error: spawnError,
    isProcessing: isSpawning,
    playerExists,
    spawnPlayer,
  } = useSpawnPlayer();

  // Get current game state from store
  const {
    gamePhase: storeGamePhase,
    setGamePhase,
    isPlayerInitialized,
  } = useAppStore();

  useEffect(() => {
    audioControls.playLobby();
    setTimeout(() => setIsLoaded(true), 10);
  }, [audioControls]);

  // Determine current state
  const isConnected = status === "connected";
  const actionInProgress = isInitializing || isSpawning;
  const hasError = playerError || spawnError || initError;
  const isLoading =
    isConnecting ||
    status === "connecting" ||
    isInitializing ||
    isSpawning ||
    playerLoading ||
    actionInProgress;

  // Handle initialization
  const handleInitialize = useCallback(async () => {
    try {
      const result = await initializePlayer();
      if (!result.success && result.error) {
        console.error("Initialization failed:", result.error);
      }
    } catch (error) {
      console.error("Unexpected error during initialization:", error);
    }
  }, [initializePlayer]);

  // Handle start game with spawn player
  const handleStartGame = useCallback(async () => {
    if (!isConnected) {
      console.log("Please connect first");
      return;
    }

    // Spawn player first
    try {
      const result = await spawnPlayer();
      if (result.success) {
        setGamePhase(GamePhase.WALKING);
        console.log("🎉 After spawned successfully!", storeGamePhase);
        onStartGame();
      } else {
        console.error("Failed to spawn player:", result.error);
      }
    } catch (error) {
      console.error("Error spawning player:", error);
    }
  }, [isConnected, player, playerExists, spawnPlayer, onStartGame]);

  // Get button text and handler for top right button
  const getConnectionButtonProps = () => {
    if (!isConnected) {
      return {
        text: "Connect",
        icon: <Wallet className="w-4 h-4" />,
        onClick: handleConnect,
        disabled: isLoading,
        bgClass:
          "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
      };
    }

    if (!isPlayerInitialized && storeGamePhase === GamePhase.UNINITIALIZED) {
      return {
        text: "Initialize",
        icon: <Settings className="w-4 h-4" />,
        onClick: handleInitialize,
        disabled: isLoading,
        bgClass:
          "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
      };
    }

    return {
      text: "Ready",
      icon: <UserPlus className="w-4 h-4" />,
      onClick: () => {},
      disabled: false,
      bgClass:
        "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
    };
  };

  const buttonProps = getConnectionButtonProps();

  return (
    <div
      className="w-screen h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(assets/bg.jpg)`,
      }}
    >
      {/* Audio Controls */}
        <div className="absolute top-8 left-8 z-20 flex items-center gap-4">
          <button
            className="bg-black/50 border border-white/30 rounded-full w-12 h-12 text-white text-xl
                     cursor-pointer transition-all duration-300 backdrop-blur-md
                     hover:bg-black/70 hover:border-white/50 hover:scale-110"
            onClick={audioControls.toggleMute}
            title={audioControls.isMuted ? "Unmute" : "Mute"}
          >
            {audioControls.isMuted ? "🔇" : "🔊"}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={audioControls.volume}
            onChange={(e) =>
              audioControls.setVolume(parseFloat(e.target.value))
            }
            className={`w-24 h-1 bg-white/30 rounded-full outline-none appearance-none slider ${
              audioControls.isMuted ? "opacity-50" : "opacity-100"
            }`}
          />
        </div>
      {/* Connection/Initialize Button - Top Right */}
      <div className="absolute top-8 right-8 z-20">
        <button
          className={`
            ${buttonProps.bgClass}
            border-2 border-white/30 rounded-xl px-5 py-3 text-sm font-bold text-white
            backdrop-blur-md transition-all duration-300 font-orbitron shadow-lg shadow-black/30
            flex items-center justify-center min-w-32 gap-2
            ${
              buttonProps.disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
            }
            ${buttonProps.disabled ? "" : "hover:border-white/50"}
          `}
          onClick={buttonProps.onClick}
          disabled={buttonProps.disabled}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isConnecting
                ? "Connecting..."
                : isInitializing
                ? "Initializing..."
                : isSpawning
                ? "Spawning..."
                : "Loading..."}
            </>
          ) : (
            <>
              {buttonProps.icon}
              {buttonProps.text}
            </>
          )}
        </button>
      </div>

      {/* Animated overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-blue-900/60 animate-pulse" />

      {/* Floating particles effect */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.3), transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.3), transparent),
            radial-gradient(2px 2px at 160px 30px, rgba(255,255,255,0.2), transparent)
          `,
          backgroundSize: "200px 100px",
          animation: "stars 20s linear infinite",
        }}
      />

      {/* Main content */}
      <div
        className={`
          z-10 text-center transition-all duration-700 ease-out
          ${
            isLoaded
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-5 scale-95 opacity-0"
          }
        `}
      >
        {/* Game Title */}
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-5 font-orbitron tracking-widest bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent animate-pulse">
          Elven Escape
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-white/80 mb-12 italic drop-shadow-lg">
          Embark on an epic journey through mystical forests
        </p>

        {/* Menu Buttons */}
        <div className="flex flex-col items-center gap-4">
          <button
            className={`
              bg-gradient-to-r from-white/20 to-white/10 border-2 border-white/30 rounded-2xl 
              px-10 py-4 text-lg font-bold text-white backdrop-blur-md transition-all duration-300
              uppercase tracking-wider font-orbitron shadow-lg shadow-black/30 min-w-52
              ${
                !isConnected
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:-translate-y-0.5 hover:from-white/30 hover:to-white/20 hover:border-white/50 hover:shadow-xl hover:shadow-black/40"
              }
            `}
            onClick={handleStartGame}
            disabled={!isConnected}
          >
            ⚔️ Start Adventure
          </button>

          {/* <button className="bg-gradient-to-r from-white/20 to-white/10 border-2 border-white/30 rounded-2xl 
                     px-10 py-4 text-lg font-bold text-white backdrop-blur-md transition-all duration-300
                     uppercase tracking-wider font-orbitron shadow-lg shadow-black/30 min-w-52
                     cursor-pointer hover:-translate-y-0.5 hover:from-white/30 hover:to-white/20 
                     hover:border-white/50 hover:shadow-xl hover:shadow-black/40"
            onClick={() => { 
            }}
          >
            ⚙️ Settings
          </button> */}

          <button
            className="bg-gradient-to-r from-white/20 to-white/10 border-2 border-white/30 rounded-2xl 
                     px-10 py-4 text-lg font-bold text-white backdrop-blur-md transition-all duration-300
                     uppercase tracking-wider font-orbitron shadow-lg shadow-black/30 min-w-52 opacity-70
                     cursor-pointer hover:-translate-y-0.5 hover:from-white/30 hover:to-white/20 
                     hover:border-white/50 hover:shadow-xl hover:shadow-black/40 hover:opacity-90"
            onClick={() => window.close()}
          >
            🚪 Exit
          </button>
        </div>

        
      </div>

      {/* Status message */}
      {hasError && (
        <div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20
                      bg-red-500/10 border border-red-500/30 rounded-lg px-5 py-3 
                      text-red-400 text-sm backdrop-blur-md"
        >
          Error: {spawnError || initError || playerError}
        </div>
      )}

      {/* Connection status */}
      {address && (
        <div
          className="absolute top-24 right-8 z-20
                      bg-black/30 border border-white/20 rounded-lg px-3 py-2 
                      text-white/80 text-xs font-mono backdrop-blur-md"
        >
          {`${address.slice(0, 6)}...${address.slice(-4)}`}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        .font-orbitron {
          font-family: 'Orbitron', 'Arial', sans-serif;
        }
        
        @keyframes stars {
          0% { transform: translateX(0) translateY(0); }
          100% { transform: translateX(-200px) translateY(-100px); }
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default MenuScreen;
