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
  canStepForward: boolean;
  resetStepForwardState: () => void;
}

export const useStepForwardAction = (): UseStepForwardActionReturn => {
  const { account, status } = useAccount(); 
  const { client } = useDojoSDK();
  
  // Store selectors - using the updated store structure
  const {
    player,
    position,
    stepCount,
    health,
    gamePhase,
    overloadState,
    currentEncounter,
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

  // Enhanced validation logic
  const getValidationError = (): string | null => {
    if (!account) return "Please connect your controller";
    if (status !== "connected") return "Controller not connected";
    if (!isPlayerInitialized) return "Player not initialized";
    if (!health || Number(health.current) <= 0) return "Player is dead - respawn required";
    if (overloadState?.is_active) return `Overload active - ${overloadState.steps_remaining} steps remaining`;
    if (gamePhase === GamePhase.DEAD) return "Player is dead - respawn required";
    if (gamePhase === GamePhase.OVERLOAD) return "Overload state active";
    // if (gamePhase === GamePhase.ENCOUNTER) return "Active encounter in progress - resolve before stepping";
    if (gamePhase === GamePhase.UNINITIALIZED) return "Game not initialized";
    if (gamePhase === GamePhase.INITIALIZING) return "Game is initializing";
    if (gamePhase === GamePhase.SPAWNING) return "Player is spawning";
    
    if (actionInProgress) return "Another action is in progress";
    if (stepForwardState.isLoading) return "Step forward in progress";
    // if (!canTakeStep) return "Step not available";
    
    return null;
  };

  const canStepForward = getValidationError() === null;

  // Debug logging (can be removed in production)
  console.log("Step Forward Validation:", {
    canStepForward,
    validationError: getValidationError(),
    account: !!account,
    status,
    isPlayerInitialized,
    isAlive: health ? Number(health.current) > 0 : false,
    isNotOverloaded: !overloadState?.is_active,
    gamePhase,
    hasNoActiveEncounter: !isInEncounter(),
    canTakeStep,
    isNotBusy: !actionInProgress && !stepForwardState.isLoading
  });
 
  const executeStepForward = useCallback(async () => {
    const validationError = getValidationError();
    
    if (validationError) {
      const errorState = {
        isLoading: false,
        error: validationError,
        txHash: null,
        txStatus: null
      };
      
      setStepForwardState(errorState);
      setError(validationError);
      
      // Auto-clear error after 3 seconds
      setTimeout(() => {
        setStepForwardState(prev => ({ ...prev, error: null }));
        setError(null);
      }, 3000);
      
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
          player: account?.address ||"null",
          x: newPosition
        });
        
        setStepCount({
          player:account?.address ||"null",
          count: newStepCount
        });
        
        // Update player steps
        if (player) {
          updatePlayer({
            steps: newPlayerSteps
          });
        }
        
        // Clear any existing encounter
        if (currentEncounter) {
          setCurrentEncounter(null);
        }
        
        // Add step taken event (this will auto-update stats and handle state)
        addStepTaken({
          player: account?.address ||"null",
          new_position: newPosition,
          step_count: newStepCount
        });
        
        // Ensure we're in playing phase if successful
        if (gamePhase !== GamePhase.PLAYING) {
          setGamePhase(GamePhase.PLAYING);
        }
        
        setStepForwardState({
          isLoading: false,
          error: null,
          txHash: tx.transaction_hash || null,
          txStatus: 'SUCCESS'
        });

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
      // Reset action state - canTakeStep is now handled by addStepTaken
      setActionInProgress(false);
    }
  }, [
    account,
    status,
    client.actions,
    isPlayerInitialized,
    health,
    overloadState,
    gamePhase,
    currentEncounter,
    position,
    stepCount,
    player,
    canTakeStep,
    actionInProgress,
    stepForwardState.isLoading,
    // Store actions
    setPosition,
    setStepCount,
    updatePlayer,
    setGamePhase,
    setCanTakeStep,
    setCurrentEncounter,
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