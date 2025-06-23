import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAccount } from "@starknet-react/core";
import { Account } from "starknet";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { useStarknetConnect } from "./useStarknetConnect";
import useAppStore, { GamePhase } from "../../zustand/store";
import { usePlayer } from "./usePlayer";

// Simplified state types
interface SpawnState {
  status: 'idle' | 'checking' | 'spawning' | 'processing' | 'success' | 'error';
  error: string | null;
  txHash: string | null;
}

interface SpawnResult {
  success: boolean;
  playerExists: boolean;
  transactionHash?: string;
  error?: string;
}

export const useSpawnPlayer = () => {
  const { useDojoStore, client } = useDojoSDK();
  const dojoState = useDojoStore((state) => state);
  const { account } = useAccount();
  const { status: connectionStatus } = useStarknetConnect();
  const { refetch: refetchPlayer } = usePlayer();
  
  // Store actions
  const { 
    setError,
    setGamePhase,
    setPlayerInitialized,
    setActionInProgress,
    player,
    isPlayerInitialized,
    gamePhase,
    actionInProgress
  } = useAppStore();

  // Local spawn state
  const [spawnState, setSpawnState] = useState<SpawnState>({
    status: 'idle',
    error: null,
    txHash: null
  });

  // Validation helpers
  const validateConnection = useCallback((): string | null => {
    if (connectionStatus !== "connected") {
      return "Wallet not connected. Please connect your wallet first.";
    }
    if (!account) {
      return "No account found. Please connect your wallet.";
    }
    return null;
  }, [connectionStatus, account]);

  const isProcessing = spawnState.status !== 'idle' && spawnState.status !== 'error';

  // Core spawn function
  const spawnPlayer = useCallback(async (): Promise<SpawnResult> => {
     

    const validationError = validateConnection();
    if (validationError) {
      setSpawnState({ status: 'error', error: validationError, txHash: null });
      return { success: false, playerExists: false, error: validationError };
    }

    const transactionId = uuidv4();
    
    try {
      // Start spawning
      setSpawnState({ status: 'spawning', error: null, txHash: null });
      setActionInProgress(true);
      setGamePhase(GamePhase.SPAWNED);
      setError(null);

      console.log("🎯 Spawning player...");

      // Execute spawn transaction
      const spawnTx = await client.actions.spawn(account as Account);
      console.log("📥 Spawn transaction:", spawnTx);

      if (!spawnTx || spawnTx.code !== "SUCCESS") {
        throw new Error(`Spawn failed: ${spawnTx?.code || 'Unknown error'}`);
      }

      // Update state with transaction hash
      setSpawnState(prev => ({ 
        ...prev, 
        status: 'processing',
        txHash: spawnTx.transaction_hash 
      }));

      // Wait for transaction processing
      console.log("⏳ Processing spawn transaction...");
      await new Promise(resolve => setTimeout(resolve, 3500));
 
      // Confirm transaction
      dojoState.confirmTransaction(transactionId);
      
      // Update final state
      setSpawnState({ status: 'success', error: null, txHash: spawnTx.transaction_hash });
      console.log("🎉 Before spawned successfully!",gamePhase);
      setGamePhase(GamePhase.WALKING);
      console.log("🎉 After spawned successfully!",gamePhase);
      setPlayerInitialized(true);
      setActionInProgress(false);

      
      
      return { 
        success: true, 
        playerExists: false,
        transactionHash: spawnTx.transaction_hash 
      };

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to spawn player. Please try again.";
      
      console.error("❌ Spawn error:", error);
      
      // Cleanup on error
      dojoState.revertOptimisticUpdate(transactionId);
      setSpawnState({ status: 'error', error: errorMessage, txHash: null });
      setError(errorMessage);
      setGamePhase(GamePhase.UNINITIALIZED);
      setActionInProgress(false);
      
      return { success: false, playerExists: false, error: errorMessage };
    }
  }, [
    isProcessing,
    validateConnection,
    client,
    account,
    refetchPlayer,
    dojoState,
    setActionInProgress,
    setGamePhase,
    setError,
    setPlayerInitialized
  ]);

  // Check if player exists and initialize
  const checkAndInitialize = useCallback(async (): Promise<SpawnResult> => {
    if (isProcessing) {
      return { success: false, playerExists: false, error: "Already processing" };
    }

    const validationError = validateConnection();
    if (validationError) {
      setSpawnState({ status: 'error', error: validationError, txHash: null });
      return { success: false, playerExists: false, error: validationError };
    }

    try {
      setSpawnState({ status: 'checking', error: null, txHash: null });
      setActionInProgress(true);
      setGamePhase(GamePhase.INITIALIZING);
      setError(null);

      console.log("🎮 Checking player status...");

      // Refetch latest player data
      await refetchPlayer();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check current state
      const currentState = useAppStore.getState();
      const playerExists = currentState.player !== null && currentState.isPlayerInitialized;

      console.log("🎮 Player check result:", { 
        playerExists, 
        hasPlayer: !!currentState.player,
        isInitialized: currentState.isPlayerInitialized
      });

      if (playerExists) {
        // Player exists - ready to play
        setSpawnState({ status: 'success', error: null, txHash: null });
        setGamePhase(GamePhase.WALKING);
        setActionInProgress(false);
        
        console.log("✅ Player ready");
        
        return { success: true, playerExists: true };
      } else {
        // Player needs to be spawned
        setSpawnState({ status: 'idle', error: null, txHash: null });
        setGamePhase(GamePhase.UNINITIALIZED);
        setActionInProgress(false);
        
        console.log("🆕 Player needs spawning");
        
        return { 
          success: false, 
          playerExists: false,
          error: "Player needs to be spawned"
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to check player status";
      
      console.error("❌ Check error:", error);
      
      setSpawnState({ status: 'error', error: errorMessage, txHash: null });
      setError(errorMessage);
      setGamePhase(GamePhase.UNINITIALIZED);
      setActionInProgress(false);
      
      return { success: false, playerExists: false, error: errorMessage };
    }
  }, [
    isProcessing,
    validateConnection,
    refetchPlayer,
    setActionInProgress,
    setGamePhase,
    setError
  ]);

  // Reset function
  const reset = useCallback(() => {
    console.log("🔄 Resetting spawn state");
    setSpawnState({ status: 'idle', error: null, txHash: null });
    setError(null);
    setActionInProgress(false);
  }, [setError, setActionInProgress]);

  // Auto-reset on connection change
  useEffect(() => {
    if (connectionStatus !== "connected") {
      reset();
    }
  }, [connectionStatus, reset]);

  return {
    // State
    status: spawnState.status,
    error: spawnState.error,
    txHash: spawnState.txHash,
    isProcessing,
    isConnected: connectionStatus === "connected",
    playerExists: player !== null && isPlayerInitialized,
    gamePhase,
    actionInProgress,
    
    // Actions
    spawnPlayer,
    checkAndInitialize,
    reset
  };
};