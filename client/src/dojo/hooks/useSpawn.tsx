import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAccount } from "@starknet-react/core";
import { Account } from "starknet";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { useStarknetConnect } from "./useStarknetConnect";
import useAppStore, { GamePhase } from "../../zustand/store";
import { usePlayer } from "./usePlayer";

// Types
interface SpawnState {
  isSpawning: boolean;
  error: string | null;
  completed: boolean;
  step: 'checking' | 'spawning' | 'loading' | 'success';
  txHash: string | null;
  txStatus: 'PENDING' | 'SUCCESS' | 'REJECTED' | null;
}

interface SpawnResponse {
  success: boolean;
  playerExists: boolean;
  transactionHash?: string;
  error?: string;
}

interface FullInitializeResponse {
  success: boolean;
  playerExists: boolean;
  transactionHash?: string;
  error?: string;
}

export const useSpawnPlayer = () => {
  const { useDojoStore, client } = useDojoSDK();
  const state = useDojoStore((state) => state);
  const { account } = useAccount();
  const { status } = useStarknetConnect();
  const { player, isLoading: playerLoading, refetch: refetchPlayer } = usePlayer();
  
  // Store actions
  const { 
    setLoading, 
    setError,
    setGamePhase,
    initializePlayer: storeInitializePlayer,
    startNewGame,
    setPlayerInitialized,
    setActionInProgress,
    setLastAction
  } = useAppStore();

  // Local state
  const [spawnState, setSpawnState] = useState<SpawnState>({
    isSpawning: false,
    error: null,
    completed: false,
    step: 'checking',
    txHash: null,
    txStatus: null
  });
  
  // Tracking if we're currently spawning
  const [isSpawning, setIsSpawning] = useState(false);
  
  /**
   * Spawn player - second step in the process
   */
  const spawnPlayer = useCallback(async (): Promise<SpawnResponse> => {
    // Prevent multiple executions
    if (isSpawning) {
      return { success: false, playerExists: false, error: "Already spawning" };
    }
    
    setIsSpawning(true);
    setActionInProgress(true);
    setLastAction("Spawning player...");
    
    // Validation: Check if wallet is connected
    if (status !== "connected") {
      const error = "Wallet not connected. Please connect your wallet first.";
      setSpawnState(prev => ({ ...prev, error }));
      setError(error);
      setActionInProgress(false);
      setIsSpawning(false);
      return { success: false, playerExists: false, error };
    }

    // Validation: Check if account exists
    if (!account) {
      const error = "No account found. Please connect your wallet.";
      setSpawnState(prev => ({ ...prev, error }));
      setError(error);
      setActionInProgress(false);
      setIsSpawning(false);
      return { success: false, playerExists: false, error };
    }

    const transactionId = uuidv4();

    try {
      // Start spawning
      setSpawnState(prev => ({ 
        ...prev, 
        isSpawning: true, 
        error: null,
        step: 'spawning',
        txStatus: 'PENDING'
      }));
      
      // Clear any previous errors
      setError(null);
      setGamePhase(GamePhase.SPAWNING);

      console.log("🎯 Spawning player...");
      setLastAction("Spawning player...");

      // Execute spawn transaction
      console.log("📤 Executing spawn transaction...");
      const spawnTx = await client.actions.spawn(account as Account);
      
      console.log("📥 Spawn transaction response:", spawnTx);
      
      if (spawnTx?.transaction_hash) {
        setSpawnState(prev => ({ 
          ...prev, 
          txHash: spawnTx.transaction_hash
        }));
      }
      
      if (spawnTx && spawnTx.code === "SUCCESS") {
        console.log("🎉 Player spawned successfully!");
        
        setSpawnState(prev => ({ 
          ...prev, 
          txStatus: 'SUCCESS',
          step: 'loading'
        }));
        
        // Wait for spawn transaction to be processed
        console.log("⏳ Waiting for spawn transaction to be processed...");
        setLastAction("Processing spawn...");
        await new Promise(resolve => setTimeout(resolve, 3500));
        
        // Refetch player data
        console.log("🔄 Refetching player data after spawn...");
        setLastAction("Loading player data...");
        await refetchPlayer();
        
        // Update store with player data and set game state
        const updatedState = useAppStore.getState();
        if (updatedState.player) {
          storeInitializePlayer(updatedState.player);
          setGamePhase(GamePhase.PLAYING);
          setPlayerInitialized(true);
        }
        
        setSpawnState(prev => ({ 
          ...prev, 
          completed: true,
          isSpawning: false,
          step: 'success'
        }));
        
        // Confirm transaction in store
        state.confirmTransaction(transactionId);
        
        setActionInProgress(false);
        setLastAction("Player ready");
        setIsSpawning(false);
        
        return { 
          success: true, 
          playerExists: false,
          transactionHash: spawnTx.transaction_hash 
        };
      } else {
        throw new Error("Spawn transaction failed with code: " + spawnTx?.code);
      }

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to spawn player. Please try again.";
      
      console.error("❌ Error spawning player:", error);
      
      // Revert optimistic update if applicable
      state.revertOptimisticUpdate(transactionId);
      
      // Update states
      setSpawnState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isSpawning: false,
        txStatus: 'REJECTED',
        step: 'checking'
      }));
      
      setError(errorMessage);
      setGamePhase(GamePhase.UNINITIALIZED);
      setActionInProgress(false);
      setLastAction("Spawn failed");
      setIsSpawning(false);
      
      return { success: false, playerExists: false, error: errorMessage };
    }
  }, [
    status, 
    account, 
    refetchPlayer, 
    isSpawning, 
    state, 
    client,
    setError,
    setGamePhase,
    storeInitializePlayer,
    setPlayerInitialized,
    setActionInProgress,
    setLastAction
  ]); 

  /**
   * Check if player exists and handle the full initialization flow
   */
  const checkAndInitializePlayer = useCallback(async (): Promise<FullInitializeResponse> => {
    // Prevent multiple executions
    if (isSpawning) {
      return { success: false, playerExists: false, error: "Already processing" };
    }
    
    setActionInProgress(true);
    setLastAction("Checking player...");
    
    try {
      setSpawnState(prev => ({ 
        ...prev, 
        step: 'checking'
      }));
      
      // Clear any previous errors
      setError(null);
      setGamePhase(GamePhase.INITIALIZING);

      console.log("🎮 Starting player check and initialization...");
      
      // Refetch player data
      console.log("🔄 Fetching latest player data...");
      setLastAction("Checking player data...");
      await refetchPlayer();
      
      // Wait a bit to ensure data is loaded
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get current player state from store
      const currentState = useAppStore.getState();
      const storePlayer = currentState.player;
      
      // Check if player exists
      const playerExists = storePlayer !== null && currentState.isPlayerInitialized;
      
      console.log("🎮 Player check:", { 
        playerExists, 
        playerInStore: !!storePlayer,
        isPlayerInitialized: currentState.isPlayerInitialized,
        accountAddress: account?.address,
        gamePhase: currentState.gamePhase
      });

      if (playerExists) {
        // Player already exists - just update the game phase
        console.log("✅ Player already exists, setting game phase to playing...");
        
        setSpawnState(prev => ({ 
          ...prev, 
          completed: true,
          step: 'success'
        }));
        
        setGamePhase(GamePhase.PLAYING);
        setActionInProgress(false);
        setLastAction("Player ready");
        
        return { 
          success: true, 
          playerExists: true
        };
      } else {
        // Player doesn't exist - redirect to initialization flow
        console.log("🆕 Player does not exist, needs initialization and spawn...");
        
        setActionInProgress(false);
        setLastAction("Player needs initialization");
        setGamePhase(GamePhase.UNINITIALIZED);
        
        return { 
          success: false, 
          playerExists: false,
          error: "Player needs to be initialized first"
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to check player status. Please try again.";
      
      console.error("❌ Error checking player:", error);
      
      setSpawnState(prev => ({ 
        ...prev, 
        error: errorMessage,
        step: 'checking'
      }));
      
      setError(errorMessage);
      setGamePhase(GamePhase.UNINITIALIZED);
      setActionInProgress(false);
      setLastAction("Check failed");
      
      return { success: false, playerExists: false, error: errorMessage };
    }
  }, [
    account, 
    refetchPlayer, 
    isSpawning,
    setError,
    setGamePhase,
    setActionInProgress,
    setLastAction
  ]);

  /**
   * Reset spawn state
   */
  const resetSpawner = useCallback(() => {
    console.log("🔄 Resetting spawner state...");
    setIsSpawning(false);
    setSpawnState({
      isSpawning: false,
      error: null,
      completed: false,
      step: 'checking',
      txHash: null,
      txStatus: null
    });
    
    // Reset store states
    setError(null);
    setActionInProgress(false);
    setLastAction(null);
  }, [setError, setActionInProgress, setLastAction]);

  /**
   * Start a completely new game (reset everything)
   */
  const startNewGameFlow = useCallback(() => {
    console.log("🎮 Starting new game flow...");
    startNewGame();
    resetSpawner();
    setGamePhase(GamePhase.UNINITIALIZED);
  }, [startNewGame, resetSpawner, setGamePhase]);

  // Sync loading state with store
  useEffect(() => {
    setLoading(spawnState.isSpawning || playerLoading);
  }, [spawnState.isSpawning, playerLoading, setLoading]);

  // Get current store state for return values
  const currentStoreState = useAppStore();

  return {
    // State
    isSpawning: spawnState.isSpawning,
    error: spawnState.error,
    completed: spawnState.completed,
    currentStep: spawnState.step,
    txHash: spawnState.txHash,
    txStatus: spawnState.txStatus,
    isConnected: status === "connected",
    playerExists: currentStoreState.player !== null && currentStoreState.isPlayerInitialized,
    gamePhase: currentStoreState.gamePhase,
    actionInProgress: currentStoreState.actionInProgress,
    lastAction: currentStoreState.lastAction,
    
    // Actions
    spawnPlayer,
    checkAndInitializePlayer,
    resetSpawner,
    startNewGameFlow
  };
};