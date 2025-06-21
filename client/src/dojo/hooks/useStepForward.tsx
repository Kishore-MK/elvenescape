import { useState, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { Account } from "starknet";
import useAppStore, { GamePhase, EncounterType } from "../../zustand/store";

interface StepForwardActionState {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  txStatus: 'PENDING' | 'SUCCESS' | 'REJECTED' | null;
}

interface UseStepForwardActionReturn {
  stepForwardState: StepForwardActionState;
  executeStepForward: () => Promise<void>;
  canStepForward: boolean | undefined;
  resetStepForwardState: () => void;
}

export const useStepForwardAction = (): UseStepForwardActionReturn => {
  const { account, status } = useAccount(); 
  const { client } = useDojoSDK();
  
  // Store selectors
  const {
    player,
    position,
    stepCount,
    health,
    gamePhase,
    overloadState,
    currentEncounter,
    entitySpawnState,
    canTakeStep,
    isPlayerInitialized,
    actionInProgress,
    
    // Store actions
    setPosition,
    setStepCount,
    updatePlayer,
    setGamePhase,
    setCanTakeStep,
    setCurrentEncounter,
    setEntitySpawnState,
    setActionInProgress,
    setLastAction,
    setError,
    addStepTaken,
    
    // Utility functions
    isInEncounter,
    getCurrentEncounterType
  } = useAppStore();

  const [stepForwardState, setStepForwardState] = useState<StepForwardActionState>({
    isLoading: false,
    error: null,
    txHash: null,
    txStatus: null
  });

  // Enhanced validation using store state
  const isConnected = status === "connected";
  const isAlive = Number(health?.current || 0) > 0;
  const isNotOverloaded = !overloadState?.is_active;
  const isPlayingPhase = gamePhase === GamePhase.PLAYING;
  const hasNoActiveEncounter = !isInEncounter();
  const isNotBusy = !actionInProgress && !stepForwardState.isLoading;
  
  const canStepForward = 
    isConnected && 
    account && 
    isPlayerInitialized && 
    isAlive && 
    isNotOverloaded && 
    isPlayingPhase && 
    canTakeStep && 
    isNotBusy;
 console.log("CAn step forward",isConnected,
    account,
    isPlayerInitialized,
    isAlive,
    isNotOverloaded,
    isPlayingPhase,
    hasNoActiveEncounter,
    canTakeStep,
    isNotBusy);
 
  const executeStepForward = useCallback(async () => {
    if (!canStepForward || !account) {
      let errorMsg = "Cannot step forward right now";
      
      if (!account) {
        errorMsg = "Please connect your controller";
      } else if (!isPlayerInitialized) {
        errorMsg = "Player not initialized";
      } else if (!isAlive) {
        errorMsg = "Player is dead - respawn required";
      } else if (overloadState?.is_active) {
        errorMsg = `Overload active - ${overloadState.steps_remaining} steps remaining`;
      } else if (gamePhase === GamePhase.ENCOUNTER) {
        errorMsg = "Active encounter in progress - resolve before stepping";
      } else if (gamePhase === GamePhase.DEAD) {
        errorMsg = "Player is dead - respawn required";
      } else if (gamePhase === GamePhase.OVERLOAD) {
        errorMsg = "Overload state active";
      } else if (isInEncounter()) {
        const encounterType = getCurrentEncounterType();
        const encounterName = encounterType === EncounterType.GATEKEEPER 
          ? "gatekeeper" 
          : encounterType === EncounterType.SHRINE 
          ? "shrine" 
          : encounterType === EncounterType.TRAP 
          ? "trap" 
          : "unknown";
        errorMsg = `Cannot step during ${encounterName} encounter`;
      } else if (actionInProgress) {
        errorMsg = "Another action is in progress";
      } else if (!canTakeStep) {
        errorMsg = "Step not available";
      }
      
      setStepForwardState(prev => ({ ...prev, error: errorMsg }));
      setError(errorMsg);
      return;
    }

    try {
      // Set loading states
      setStepForwardState({
        isLoading: true,
        error: null,
        txHash: null,
        txStatus: 'PENDING'
      });
      
      setActionInProgress(true);
      setLastAction("step_forward");
      setCanTakeStep(false);
      setError(null);

      console.log("📤 Executing step forward transaction...");
      
      const tx = await client.actions.stepForward(account as Account);
      
      console.log("📥 Step forward transaction response:", tx);

      if (tx?.transaction_hash) {
        setStepForwardState(prev => ({ ...prev, txHash: tx.transaction_hash }));
      }

      // Check if transaction was successful
      if (tx) {
        console.log("✅ Step forward transaction successful!");
        
        // Calculate new values
        const currentPosition = position?.x || 0;
        const currentStepCount = stepCount?.count || 0;
        const playerSteps = player?.steps || 0;
        const newPosition = Number(currentPosition) + 1;
        const newStepCount = Number(currentStepCount) + 1;
        const newPlayerSteps = Number(playerSteps) + 1;
        
        // Optimistic updates
        setPosition({
          player: account.address,
          x: newPosition
        });
        
        setStepCount({
          player: account.address,
          count: newStepCount
        });
        
        // Update player steps
        if (player) {
          updatePlayer({
            steps: newPlayerSteps
          });
        }
        
        // Update entity spawn state
        if (entitySpawnState) {
          setEntitySpawnState({
            ...entitySpawnState,
            last_spawn_position: newPosition
          });
        }
        
        // Clear any existing encounter
        if (currentEncounter) {
          setCurrentEncounter(null);
        }
        
        // Add step taken event (this will auto-update stats)
        addStepTaken({
          player: account.address,
          new_position: newPosition,
          step_count: newStepCount
        });
        
        // Update game phase if needed
        if (gamePhase !== GamePhase.PLAYING) {
          setGamePhase(GamePhase.PLAYING);
        }
        
        setStepForwardState(prev => ({
          ...prev,
          txStatus: 'SUCCESS',
          isLoading: false
        }));

        // Auto-clear success state after 3 seconds
        setTimeout(() => {
          setStepForwardState({
            isLoading: false,
            error: null,
            txHash: null,
            txStatus: null
          });
        }, 3000);
        
        console.log(`🚶 Step complete: Position ${newPosition}, Total steps: ${newStepCount}`);
        
      } else {
        throw new Error('Step forward transaction failed - no response');
      }
    } catch (error) {
      console.error("❌ Error executing step forward:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setStepForwardState({
        isLoading: false,
        error: errorMessage,
        txHash: null,
        txStatus: 'REJECTED'
      });
      
      setError(errorMessage);

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setStepForwardState({
          isLoading: false,
          error: null,
          txHash: null,
          txStatus: null
        });
        setError(null);
      }, 5000);
    } finally {
      // Reset action state
      setActionInProgress(false);
      setCanTakeStep(true);
    }
  }, [
    canStepForward,
    account,
    client.actions,
    isPlayerInitialized,
    isAlive,
    overloadState,
    gamePhase,
    currentEncounter,
    position,
    stepCount,
    player,
    entitySpawnState,
    canTakeStep,
    actionInProgress,
    // Store actions
    setPosition,
    setStepCount,
    updatePlayer,
    setGamePhase,
    setCanTakeStep,
    setCurrentEncounter,
    setEntitySpawnState,
    setActionInProgress,
    setLastAction,
    setError,
    addStepTaken,
    // Utility functions
    isInEncounter,
    getCurrentEncounterType
  ]);
 
  const resetStepForwardState = useCallback(() => {
    setStepForwardState({
      isLoading: false,
      error: null,
      txHash: null,
      txStatus: null
    });
    setError(null);
  }, [setError]);

  return {
    stepForwardState,
    executeStepForward,
    canStepForward,
    resetStepForwardState
  };
};