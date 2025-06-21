import { useState, useCallback, useMemo } from "react";
import { useAccount } from "@starknet-react/core";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { Account } from "starknet";
import useAppStore, { GamePhase } from "../../zustand/store";

type TransactionStatus = 'idle' | 'pending' | 'success' | 'failed';

interface StepForwardState {
  status: TransactionStatus;
  error: string | null;
  txHash: string | null;
}

interface UseStepForwardReturn {
  state: StepForwardState;
  execute: () => Promise<void>;
  canExecute: boolean;
  reset: () => void;
}

export const useStepForward = (): UseStepForwardReturn => {
  const { account, status: accountStatus } = useAccount();
  const { client } = useDojoSDK();

  // Zustand store selectors
  const {
    player,
    position,
    stepCount,
    health,
    gamePhase,
    overloadState,
    isPlayerInitialized,
    actionInProgress,
    setPosition,
    setStepCount,
    setPlayer,
    setGamePhase,
    setActionInProgress,
    setError,
    addStepTaken,
  } = useAppStore();

  // Local state for transaction handling
  const [state, setState] = useState<StepForwardState>({
    status: 'idle',
    error: null,
    txHash: null,
  });

  // Validation logic - memoized for performance
  const validationResult = useMemo(() => {
    if (!account) return { valid: false, reason: "Wallet not connected" };
    if (accountStatus !== "connected") return { valid: false, reason: "Wallet connecting..." };
    if (!isPlayerInitialized) return { valid: false, reason: "Player not initialized" };
    if (!health || Number(health.current) <= 0) return { valid: false, reason: "Player is dead" };
    if (overloadState?.is_active) return { valid: false, reason: "Overload active" };
    if (actionInProgress || state.status === 'pending') return { valid: false, reason: "Action in progress" };
    
    // Game phase validation
    const invalidPhases = [GamePhase.UNINITIALIZED, GamePhase.INITIALIZING, GamePhase.DEAD, GamePhase.OVERLOADED];
    if (invalidPhases.includes(gamePhase)) {
      return { valid: false, reason: `Invalid game state: ${gamePhase}` };
    }

    return { valid: true, reason: null };
  }, [account, accountStatus, isPlayerInitialized, health, overloadState, actionInProgress, state.status, gamePhase]);

  const canExecute = validationResult.valid;

  // Clear error/success states automatically
  const clearStateAfterDelay = useCallback((delay: number = 3000) => {
    setTimeout(() => {
      setState(prev => ({ ...prev, error: null, status: 'idle' }));
      setError(null);
    }, delay);
  }, [setError]);

  // Main execution function
  const execute = useCallback(async (): Promise<void> => {
    // Pre-execution validation
    if (!validationResult.valid) {
      const error = validationResult.reason || "Cannot execute step";
      setState({ status: 'failed', error, txHash: null });
      setError(error);
      clearStateAfterDelay();
      return;
    }

    // Set loading state
    setState({ status: 'pending', error: null, txHash: null });
    setActionInProgress(true);
    setError(null);

    try {
      console.log("🚶 Executing step forward...");
      
      // Execute blockchain transaction
      const txResult = await client.actions.stepForward(account as Account);
      
      if (!txResult?.transaction_hash) {
        throw new Error("Transaction failed - no hash returned");
      }

      console.log("✅ Step forward successful:", txResult.transaction_hash);

      // Calculate optimistic updates
      const currentPos = Number(position?.x || 0);
      const currentSteps = Number(stepCount?.count || 0);
      const playerSteps = Number(player?.steps || 0);
      
      const newPosition = currentPos + 1;
      const newStepCount = currentSteps + 1;
      const newPlayerSteps = playerSteps + 1;

      // Apply optimistic updates
      setPosition({
        player: account?.address || "null",
        x: newPosition,
      });

      setStepCount({
        player: account?.address || "null",
        count: newStepCount,
      });

      if (player) {
        setPlayer({
          ...player,
          steps: newPlayerSteps,
        });
      }

      // Add event for UI feedback
      addStepTaken({
        player: account?.address || "null",
        new_position: newPosition,
        step_count: newStepCount,
      });

      // Ensure correct game phase
      if (gamePhase !== GamePhase.WALKING) {
        setGamePhase(GamePhase.WALKING);
      }

      // Set success state
      setState({
        status: 'success',
        error: null,
        txHash: txResult.transaction_hash,
      });

      clearStateAfterDelay();

      console.log(`🎯 Step complete: Position ${newPosition}, Steps ${newStepCount}`);

    } catch (error) {
      console.error("❌ Step forward failed:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Transaction failed";
      
      setState({
        status: 'failed',
        error: errorMessage,
        txHash: null,
      });
      
      setError(errorMessage);
      clearStateAfterDelay(5000); // Longer delay for errors
    } finally {
      setActionInProgress(false);
    }
  }, [
    validationResult,
    account,
    client.actions,
    position,
    stepCount,
    player,
    gamePhase,
    setPosition,
    setStepCount,
    setPlayer,
    setGamePhase,
    setActionInProgress,
    setError,
    addStepTaken,
    clearStateAfterDelay,
  ]);

  // Reset function
  const reset = useCallback(() => {
    setState({ status: 'idle', error: null, txHash: null });
    setError(null);
  }, [setError]);

  return {
    state,
    execute,
    canExecute,
    reset,
  };
};