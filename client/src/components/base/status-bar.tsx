import { Button } from "../ui/button";
import { useStarknetConnect } from "../../dojo/hooks/useStarknetConnect";
import { useSpawnPlayer } from "../../dojo/hooks/useSpawn";
import { useInitializePlayer } from "../../dojo/hooks/useInitializePlayer";
import { usePlayer } from "../../dojo/hooks/usePlayer";
import { useAccount } from "@starknet-react/core"
import { Loader2, Wallet, CheckCircle, LogOut, UserPlus, ExternalLink, RefreshCw, AlertCircle, Settings } from "lucide-react"
import { useCallback, useEffect } from "react"
import useAppStore, { GamePhase } from "../../zustand/store";
 
export function StatusBar() {
  const {
    status,
    address,
    isConnecting,
    handleConnect,
    handleDisconnect
  } = useStarknetConnect();

  const { 
    player, 
    isLoading: playerLoading, 
    error: playerError, 
    refetch: refetchPlayer,
    gamePhase: playerGamePhase,
    isPlayerInitialized
  } = usePlayer();

  const {
    initializePlayer,
    isInitializing,
    error: initError,
    completed: initCompleted,
    txHash: initTxHash,
    txStatus: initTxStatus,
    isConnected: initIsConnected,
    actionInProgress: initActionInProgress,
    lastAction: initLastAction,
    resetInitializer
  } = useInitializePlayer();

  const {
    spawnPlayer,
    checkAndInitializePlayer,
    resetSpawner,
    isSpawning,
    error: spawnError,
    completed: spawnCompleted,
    currentStep,
    txHash: spawnTxHash,
    txStatus: spawnTxStatus,
    isConnected: spawnIsConnected,
    playerExists,
    gamePhase: spawnGamePhase,
    actionInProgress: spawnActionInProgress,
    lastAction: spawnLastAction
  } = useSpawnPlayer();

  // Get current game state from store
  const { gamePhase: storeGamePhase } = useAppStore();

  //Hook to access the connector
  const { connector } = useAccount();

  // Determine which hook's data to prioritize
  const isConnected = status === "connected";
  const actionInProgress = initActionInProgress || spawnActionInProgress;
  const lastAction = spawnLastAction || initLastAction;
  const hasError = playerError || spawnError || initError;
  const isLoading = isConnecting || status === "connecting" || isInitializing || isSpawning || playerLoading || actionInProgress;
  
  // Determine current game phase (prioritize store, then player hook, then spawn hook)
  const gamePhase = storeGamePhase || playerGamePhase || spawnGamePhase || GamePhase.UNINITIALIZED;
  
  // Determine transaction info (prioritize spawn over init)
  const txHash = spawnTxHash || initTxHash;
  const txStatus = spawnTxStatus || initTxStatus;

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusMessage = () => {
    if (hasError) {
      return spawnError || initError || playerError?.message || "An error occurred";
    }
    
    if (!isConnected) return "Connect your controller to start playing";
    
    if (actionInProgress && lastAction) {
      return lastAction;
    }
    
    if (isInitializing) {
      return "Initializing player...";
    }
    
    if (isSpawning) {
      switch (currentStep) {
        case 'checking':
          return "Checking player status...";
        case 'spawning':
          return "Creating player on blockchain...";
        case 'loading':
          return "Loading player data...";
        case 'success':
          return "Player ready!";
        default:
          return "Processing...";
      }
    }
    
    if (playerLoading) return "Loading player data...";
    
    // Game phase based messages
    switch (gamePhase) {
      case GamePhase.UNINITIALIZED:
        return isConnected ? "Initialize your player to start" : "Connect to begin";
      case GamePhase.INITIALIZING:
        return "Setting up your player...";
      case GamePhase.SPAWNING:
        return "Creating player on blockchain...";
      case GamePhase.PLAYING:
        return "Ready to play!";
      case GamePhase.DEAD:
        return "Player is dead - respawn needed";
      case GamePhase.ENCOUNTER:
        return "In encounter";
      case GamePhase.OVERLOAD:
        return "Player overloaded";
      default:
        return player || playerExists ? "Ready to play!" : "Preparing...";
    }
  };

  const getPlayerStatus = () => {
    if (hasError) return { color: "bg-red-500", text: "Error" };
    if (!isConnected) return { color: "bg-red-500", text: "Disconnected" };
    
    if (isInitializing) return { color: "bg-yellow-500", text: "Initializing..." };
    
    if (isSpawning) {
      switch (currentStep) {
        case 'checking':
          return { color: "bg-blue-500", text: "Checking..." };
        case 'spawning':
          return { color: "bg-yellow-500", text: "Creating..." };
        case 'loading':
          return { color: "bg-blue-500", text: "Loading..." };
        case 'success':
          return { color: "bg-green-500", text: "Success" };
        default:
          return { color: "bg-yellow-500", text: "Processing..." };
      }
    }
    
    // Game phase based status
    switch (gamePhase) {
      case GamePhase.UNINITIALIZED:
        return { color: "bg-yellow-500", text: "Not Initialized" };
      case GamePhase.INITIALIZING:
        return { color: "bg-blue-500", text: "Initializing..." };
      case GamePhase.SPAWNING:
        return { color: "bg-yellow-500", text: "Spawning..." };
      case GamePhase.PLAYING:
        return { color: "bg-green-500", text: "Playing" };
      case GamePhase.DEAD:
        return { color: "bg-red-500", text: "Dead" };
      case GamePhase.ENCOUNTER:
        return { color: "bg-purple-500", text: "In Encounter" };
      case GamePhase.OVERLOAD:
        return { color: "bg-orange-500", text: "Overloaded" };
      default:
        return player || playerExists ? { color: "bg-green-500", text: "Ready" } : { color: "bg-yellow-500", text: "Not Ready" };
    }
  };

  const getTxStatusDisplay = () => {
    if (!txStatus) return null;
    
    switch (txStatus) {
      case 'PENDING':
        return { icon: '⏳', text: 'Processing', color: 'text-yellow-400' };
      case 'SUCCESS':
        return { icon: '✅', text: 'Confirmed', color: 'text-green-400' };
      case 'REJECTED':
        return { icon: '❌', text: 'Failed', color: 'text-red-400' };
      default:
        return null;
    }
  };

  // Function to open the Controller Profile 
  const handlePlayerReady = useCallback(() => {
    if (!connector || !('controller' in connector)) {
      console.error("Connector not initialized");
      return;
    }
    if (connector.controller && typeof connector.controller === 'object' && 'openProfile' in connector.controller) {
      (connector.controller as { openProfile: (profile: string) => void }).openProfile("achievements");
    } else {
      console.error("Connector controller is not properly initialized");
    }
  }, [connector]);

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

  // Handle spawning
  const handleSpawn = useCallback(async () => {
    try {
      const result = await spawnPlayer();
      if (!result.success && result.error) {
        console.error("Spawn failed:", result.error);
      }
    } catch (error) {
      console.error("Unexpected error during spawn:", error);
    }
  }, [spawnPlayer]);

  // Handle check and initialize
  const handleCheckAndInitialize = useCallback(async () => {
    try {
      const result = await checkAndInitializePlayer();
      if (!result.success && result.error) {
        console.error("Check and initialize failed:", result.error);
      }
    } catch (error) {
      console.error("Unexpected error during check and initialize:", error);
    }
  }, [checkAndInitializePlayer]);

  // Reset errors when connection status changes
  useEffect(() => {
    if (status === "connected" && hasError) {
      resetInitializer();
      resetSpawner();
    }
  }, [status, hasError, resetInitializer, resetSpawner]);

  const playerStatus = getPlayerStatus();
  const txStatusDisplay = getTxStatusDisplay();

  // Determine which buttons to show
  const showInitializeButton = isConnected && !hasError && gamePhase === GamePhase.UNINITIALIZED && !isPlayerInitialized && !player;
  const showSpawnButton = isConnected && !hasError && isPlayerInitialized && !player && !playerExists;
  const showCheckButton = isConnected && !hasError && !isPlayerInitialized && !player;
  const showPlayerReadyButton = (player || playerExists || spawnCompleted || initCompleted) && !hasError && gamePhase === GamePhase.PLAYING;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="px-6 py-3 font-semibold transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(isConnecting || status === "connecting") ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Controller
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              {/* Error state button */}
              {hasError && (
                <Button
                  onClick={() => {
                    resetInitializer();
                    resetSpawner();
                  }}
                  variant="outline"
                  className="px-6 py-3 font-semibold transition-all duration-300 border-red-400/40 hover:border-red-400/60 hover:bg-red-500/10 text-red-400 hover:text-red-300"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}

              {/* Check and Initialize Button - Shows when connected but unclear state */}
              {showCheckButton && (
                <Button
                  onClick={handleCheckAndInitialize}
                  disabled={isLoading}
                  className="px-6 py-3 font-semibold transition-all duration-300 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Check Player
                    </>
                  )}
                </Button>
              )}

              {/* Initialize Player Button - Only show when uninitialized */}
              
                <Button
                  onClick={handleInitialize}
                  disabled={isLoading}
                  className="px-6 py-3 font-semibold transition-all duration-300 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Initialize Player
                    </>
                  )}
                </Button>
              
               
                <Button
                  onClick={handleSpawn}
                  disabled={isLoading}
                  className="px-6 py-3 font-semibold transition-all duration-300 shadow-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSpawning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {currentStep === 'checking' && 'Checking...'}
                      {currentStep === 'spawning' && 'Spawning...'}
                      {currentStep === 'loading' && 'Loading...'}
                      {currentStep === 'success' && 'Success!'}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Spawn Player
                    </>
                  )}
                </Button>
              

              {/* Player Ready Button - Only show when player exists and ready */}
              {showPlayerReadyButton && (
                <Button
                  onClick={handlePlayerReady}
                  className="px-6 py-3 font-semibold transition-all duration-300 shadow-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/40 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Player Ready
                </Button>
              )}

              {/* Refresh Player Button - Show when connected */}
              {isConnected && (
                <Button
                  onClick={refetchPlayer}
                  disabled={isLoading}
                  variant="outline"
                  className="px-4 py-3 border-purple-400/40 hover:border-purple-400/60 hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 transition-all duration-300 disabled:opacity-50"
                >
                  {playerLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              )}

              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="px-4 py-3 border-red-400/40 hover:border-red-400/60 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all duration-300"
                disabled={isLoading}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}

          {address && (
            <span className="text-slate-300 font-mono text-sm bg-slate-800/50 px-3 py-1 rounded-lg">
              {formatAddress(address)}
            </span>
          )}
        </div>

        <div className="text-center md:text-right">
          <div className="flex items-center gap-2 text-sm mb-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${playerStatus.color}`}></div>
            <span className="text-slate-300">
              {playerStatus.text} • Sepolia
            </span>
          </div>
          <div className={`text-xs ${hasError ? 'text-red-400' : 'text-slate-400'}`}>
            {getStatusMessage()}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {hasError && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold">Error:</span>
            <span>{spawnError || initError || playerError?.message}</span>
          </div>
        </div>
      )}

      {/* Transaction Hash Display */}
      {txHash && txStatusDisplay && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-blue-400 text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {spawnTxHash ? "Player Creation Transaction:" : "Player Initialization Transaction:"}
              </span>
              <span className={`ml-2 ${txStatusDisplay.color}`}>
                {txStatusDisplay.icon} {txStatusDisplay.text}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs bg-blue-900/30 px-2 py-1 rounded">
                {formatAddress(txHash)}
              </span>

              <a
                href={`https://sepolia.starkscan.co/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-300 hover:text-blue-200 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on StarkScan
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}