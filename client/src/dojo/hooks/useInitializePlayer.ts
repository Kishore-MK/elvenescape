import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAccount } from "@starknet-react/core";
import { Account } from "starknet";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { useStarknetConnect } from "./useStarknetConnect";
import useAppStore, { GamePhase } from "../../zustand/store";
import { usePlayer } from "./usePlayer";

// Types
interface InitializeState {
  isInitializing: boolean;
  error: string | null;
  completed: boolean;
  txHash: string | null;
  txStatus: 'PENDING' | 'SUCCESS' | 'REJECTED' | null;
}

interface InitializeResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export const useInitializePlayer = () => {
  const { useDojoStore, client } = useDojoSDK();
  const state = useDojoStore((state) => state);
  const { account } = useAccount();
  const { status } = useStarknetConnect();
  const { refetch: refetchPlayer } = usePlayer();
  
  // Store actions
  const { 
    setError,
    setGamePhase,
    setActionInProgress,
    setLastAction
  } = useAppStore();

  // Local state
  const [initState, setInitState] = useState<InitializeState>({
    isInitializing: false,
    error: null,
    completed: false,
    txHash: null,
    txStatus: null
  });
  
  // Tracking if we're currently initializing
  const [isInitializing, setIsInitializing] = useState(false);
  
  /**
   * Initialize player - first step in the process
   */
  const initializePlayer = useCallback(async (): Promise<InitializeResponse> => {
    // Prevent multiple executions
    if (isInitializing) {
      return { success: false, error: "Already initializing" };
    }
    
    setIsInitializing(true);
    setActionInProgress(true);
    setLastAction("Initializing player...");
    
    // Validation: Check if wallet is connected
    if (status !== "connected") {
      const error = "Wallet not connected. Please connect your wallet first.";
      setInitState(prev => ({ ...prev, error }));
      setError(error);
      setActionInProgress(false);
      setIsInitializing(false);
      return { success: false, error };
    }

    // Validation: Check if account exists
    if (!account) {
      const error = "No account found. Please connect your wallet.";
      setInitState(prev => ({ ...prev, error }));
      setError(error);
      setActionInProgress(false);
      setIsInitializing(false);
      return { success: false, error };
    }

    const transactionId = uuidv4();

    try {
      // Start initialization
      setInitState(prev => ({ 
        ...prev, 
        isInitializing: true, 
        error: null,
        txStatus: 'PENDING'
      }));
      
      // Clear any previous errors
      setError(null);
      setGamePhase(GamePhase.INITIALIZING);

      console.log("🎮 Initializing player...");
      setLastAction("Initializing new player...");

      // Execute initialize player transaction
      console.log("📤 Executing initialize player transaction...");
      const initTx = await client.actions.initializePlayer(account as Account);
      
      console.log("📥 Initialize transaction response:", initTx);
      
      if (initTx?.transaction_hash) {
        setInitState(prev => ({ 
          ...prev, 
          txHash: initTx.transaction_hash
        }));
      }
      
      if (initTx && initTx.code === "SUCCESS") {
        console.log("✅ Player initialized successfully!");
        
        setInitState(prev => ({ 
          ...prev, 
          completed: true,
          isInitializing: false,
          txStatus: 'SUCCESS'
        }));
        
        // Wait for initialization transaction to be processed
        console.log("⏳ Waiting for initialization transaction...");
        setLastAction("Processing initialization...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Refetch player data
        console.log("🔄 Refetching player data after initialization...");
        await refetchPlayer();
        
        // Confirm transaction in store
        state.confirmTransaction(transactionId);
        
        setActionInProgress(false);
        setLastAction("Player initialized");
        setIsInitializing(false);
        
        return { 
          success: true,
          transactionHash: initTx.transaction_hash 
        };
      } else {
        throw new Error("Initialize transaction failed with code: " + initTx?.code);
      }

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to initialize player. Please try again.";
      
      console.error("❌ Error initializing player:", error);
      
      // Revert optimistic update if applicable
      state.revertOptimisticUpdate(transactionId);
      
      // Update states
      setInitState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isInitializing: false,
        txStatus: 'REJECTED'
      }));
      
      setError(errorMessage);
      setGamePhase(GamePhase.UNINITIALIZED);
      setActionInProgress(false);
      setLastAction("Initialization failed");
      setIsInitializing(false);
      
      return { success: false, error: errorMessage };
    }
  }, [
    status, 
    account, 
    refetchPlayer, 
    isInitializing, 
    state, 
    client,
    setError,
    setGamePhase,
    setActionInProgress,
    setLastAction
  ]); 

  /**
   * Reset initialization state
   */
  const resetInitializer = useCallback(() => {
    console.log("🔄 Resetting initializer state...");
    setIsInitializing(false);
    setInitState({
      isInitializing: false,
      error: null,
      completed: false,
      txHash: null,
      txStatus: null
    });
    
    // Reset store states
    setError(null);
    setActionInProgress(false);
    setLastAction(null);
  }, [setError, setActionInProgress, setLastAction]);

  // Get current store state for return values
  const currentStoreState = useAppStore();

  return {
    // State
    isInitializing: initState.isInitializing,
    error: initState.error,
    completed: initState.completed,
    txHash: initState.txHash,
    txStatus: initState.txStatus,
    isConnected: status === "connected",
    actionInProgress: currentStoreState.actionInProgress,
    lastAction: currentStoreState.lastAction,
    
    // Actions
    initializePlayer,
    resetInitializer
  };
};