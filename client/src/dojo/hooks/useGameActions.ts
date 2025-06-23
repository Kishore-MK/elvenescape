import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAccount } from "@starknet-react/core";
import { Account, BigNumberish } from "starknet";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { useStarknetConnect } from "./useStarknetConnect";
import useAppStore from "../../zustand/store";
import * as models from "../bindings";
import { useInventory } from "./useInventory";
import { usePlayerData } from "./usePlayerStats";
import { useHealth } from "./useHealth";

// Random u64 BigNumberish generator
const generateRandomU64 = (): BigNumberish => {
  return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)).toString();
};

// Shared state interfaces
interface ActionState {
  status: "idle" | "processing" | "success" | "error";
  error: string | null;
  txHash: string | null;
}

interface ActionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// Hook for taking damage
export const useTakeDamage = () => {
  const { useDojoStore, client } = useDojoSDK();
  const dojoState = useDojoStore((state) => state);
  const { account } = useAccount();
  const { status: connectionStatus } = useStarknetConnect();

  // Store state and actions
  const {
    setActionInProgress,
    setError,
    setLastTransaction,
    addHealthDamage,
    setHealth,
    player,
    health,
    actionInProgress,
  } = useAppStore();

  // Local action state
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    error: null,
    txHash: null,
  });

  // Validation helpers
  const validateConnection = useCallback((): string | null => {
    if (connectionStatus !== "connected") {
      return "Wallet not connected. Please connect your wallet first.";
    }
    if (!account) {
      return "No account found. Please connect your wallet.";
    }
    if (!player) {
      return "Player not initialized";
    }
    if (!health) {
      return "Health data not available";
    }
    return null;
  }, [connectionStatus, account, player, health]);

  const isProcessing = actionState.status === "processing";

  // Core take damage function
  const takeDamage = useCallback(
    async (damage: BigNumberish): Promise<ActionResult> => {
      if (isProcessing || actionInProgress) {
        return { success: false, error: "Action already in progress" };
      }

      const validationError = validateConnection();
      if (validationError) {
        setActionState({
          status: "error",
          error: validationError,
          txHash: null,
        });
        return { success: false, error: validationError };
      }

      const transactionId = uuidv4();

      try {
        // Start processing
        setActionState({ status: "processing", error: null, txHash: null });
        setActionInProgress(true);
        setError(null);

        console.log("💔 Taking damage...", { damage: damage.toString() });

        // Execute damage transaction
        const damageTx = await client.actions.takeDamage(
          account as Account,
          damage
        );
        console.log("📥 Damage transaction:", damageTx);

        if (!damageTx || damageTx.code !== "SUCCESS") {
          throw new Error(
            `Take damage failed: ${damageTx?.code || "Unknown error"}`
          );
        }

        // Update state with transaction hash
        setActionState((prev) => ({
          ...prev,
          txHash: damageTx.transaction_hash,
        }));
        setLastTransaction(damageTx.transaction_hash);

        // Optimistic update
        const newCurrentHealth = Math.max(
          0,
          Number(health?.current) - Number(damage)
        );

        const healthDamageEvent: models.HealthDamage = {
          player: player?.player || "0x0",
          damage: damage,
          current_health: newCurrentHealth,
        };

        addHealthDamage(healthDamageEvent);

        const newHealth: models.Health = {
          max: health?.max || 100,
          current: newCurrentHealth,
          player: health?.player || "0x0",
        };

        setHealth(newHealth);

        // Wait for transaction processing
        console.log("⏳ Processing damage transaction...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Confirm transaction
        dojoState.confirmTransaction(transactionId);

        // Update final state
        setActionState({
          status: "success",
          error: null,
          txHash: damageTx.transaction_hash,
        });
        setActionInProgress(false);

        console.log("💔 Damage taken successfully!", {
          newHealth: newCurrentHealth,
        });

        return {
          success: true,
          transactionHash: damageTx.transaction_hash,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to take damage. Please try again.";

        console.error("❌ Take damage error:", error);

        // Cleanup on error
        dojoState.revertOptimisticUpdate(transactionId);
        setActionState({ status: "error", error: errorMessage, txHash: null });
        setError(errorMessage);
        setActionInProgress(false);

        return { success: false, error: errorMessage };
      }
    },
    [
      isProcessing,
      actionInProgress,
      validateConnection,
      client,
      account,
      player,
      health,
      dojoState,
      setActionInProgress,
      setError,
      setLastTransaction,
      addHealthDamage,
      setHealth,
    ]
  );

  // Reset function
  const reset = useCallback(() => {
    console.log("🔄 Resetting damage state");
    setActionState({ status: "idle", error: null, txHash: null });
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
    status: actionState.status,
    error: actionState.error,
    txHash: actionState.txHash,
    isProcessing,
    isConnected: connectionStatus === "connected",

    // Actions
    takeDamage,
    reset,
  };
};

// Hook for attacking gatekeeper
export const useAttackGatekeeper = () => {
  const { useDojoStore, client } = useDojoSDK();
  const dojoState = useDojoStore((state) => state);
  const { account } = useAccount();
  const { status: connectionStatus } = useStarknetConnect();

  // Store state and actions
  const {
    setActionInProgress,
    setError,
    setLastTransaction,
    canAttackGatekeeper,
    player,
    gameStats,
    actionInProgress,
  } = useAppStore();

  // Local action state
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    error: null,
    txHash: null,
  });

  // Validation helpers
  const validateConnection = useCallback((): string | null => {
    if (connectionStatus !== "connected") {
      return "Wallet not connected. Please connect your wallet first.";
    }
    if (!account) {
      return "No account found. Please connect your wallet.";
    }
    if (!player) {
      return "Player not initialized";
    }
    return null;
  }, [connectionStatus, account, player]);

  const isProcessing = actionState.status === "processing";

  // Core attack function
  const attackGatekeeper = useCallback(async (): Promise<ActionResult> => {
    if (isProcessing || actionInProgress) {
      return { success: false, error: "Action already in progress" };
    }

    const validationError = validateConnection();
    if (validationError) {
      setActionState({
        status: "error",
        error: validationError,
        txHash: null,
      });
      return { success: false, error: validationError };
    }

    const transactionId = uuidv4();

    try {
      // Start processing
      setActionState({ status: "processing", error: null, txHash: null });
      setActionInProgress(true);
      setError(null);
      const gatekeeperId = generateRandomU64();
      const gatekeeperDamage = 100;

      console.log("⚔️ Attacking gatekeeper...", {
        gatekeeperId: gatekeeperId.toString(),
      });
      console.log("currentGatekeeper ", gatekeeperId, gatekeeperDamage);

      // Execute attack transaction

      const attackTx = await client.actions.attackGatekeeper(
        account as Account,
        gatekeeperId,
        gatekeeperDamage
      );
      console.log("📥 Attack transaction:", attackTx);

      if (!attackTx || attackTx.code !== "SUCCESS") {
        throw new Error(
          `Attack gatekeeper failed: ${attackTx?.code || "Unknown error"}`
        );
      }

      // Update state with transaction hash
      setActionState((prev) => ({
        ...prev,
        txHash: attackTx.transaction_hash,
      }));
      setLastTransaction(attackTx.transaction_hash);

      // Wait for transaction processing
      console.log("⏳ Processing attack transaction...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Confirm transaction
      dojoState.confirmTransaction(transactionId);

      // Update final state
      setActionState({
        status: "success",
        error: null,
        txHash: attackTx.transaction_hash,
      });
      setActionInProgress(false);

      console.log("⚔️ Attack successful!", {
        gatekeeperId,
      });

      return {
        success: true,
        transactionHash: attackTx.transaction_hash,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to attack gatekeeper. Please try again.";

      console.error("❌ Attack gatekeeper error:", error);

      // Cleanup on error
      dojoState.revertOptimisticUpdate(transactionId);
      setActionState({ status: "error", error: errorMessage, txHash: null });
      setError(errorMessage);
      setActionInProgress(false);

      return { success: false, error: errorMessage };
    }
  }, [
    isProcessing,
    actionInProgress,
    validateConnection,
    client,
    account,
    player,
    gameStats,
    dojoState,
    setActionInProgress,
    setError,
    setLastTransaction,
  ]);

  // Reset function
  const reset = useCallback(() => {
    console.log("🔄 Resetting attack state");
    setActionState({ status: "idle", error: null, txHash: null });
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
    status: actionState.status,
    error: actionState.error,
    txHash: actionState.txHash,
    isProcessing,
    isConnected: connectionStatus === "connected",
    canAttack: canAttackGatekeeper(),

    // Actions
    attackGatekeeper,
    reset,
  };
};

// Hook for interacting with shrine
export const useInteractWithShrine = () => {
  const { useDojoStore, client } = useDojoSDK();
  const dojoState = useDojoStore((state) => state);
  const { account } = useAccount();
  const { status: connectionStatus } = useStarknetConnect();

  const { refetchHealth } = useHealth();
  const { refetchPlayerStats } = usePlayerData();
  const { refetch } = useInventory();
  // Store state and actions
  const {
    setActionInProgress,
    setError,
    setLastTransaction,
    addShrineInteraction,
    canInteractWithShrine,
    player,
    gameStats,
    actionInProgress,
    stepCount,
    health,
    inventory,
  } = useAppStore();

  // Local action state
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
    error: null,
    txHash: null,
  });

  // Validation helpers - Fixed dependency array
  const validateConnection = useCallback((): string | null => {
    if (connectionStatus !== "connected") {
      return "Wallet not connected. Please connect your wallet first.";
    }
    if (!account) {
      return "No account found. Please connect your wallet.";
    }
    if (!player) {
      return "Player not initialized";
    }
    return null;
  }, [connectionStatus, account, player]);

  const isProcessing = actionState.status === "processing";

  // Core interact function - Fixed dependencies
  const interactWithShrine = useCallback(
    async (burnSteps: BigNumberish): Promise<ActionResult> => {
      const validationError = validateConnection();
      if (validationError) {
        setActionState({
          status: "error",
          error: validationError,
          txHash: null,
        });
        return { success: false, error: validationError };
      }

      const transactionId = uuidv4();
      const shrineId = generateRandomU64();

      try {
        // Start processing
        setActionState({ status: "processing", error: null, txHash: null });
        setActionInProgress(true);
        setError(null);

        console.log("🛕 Interacting with shrine...", {
          shrineId: shrineId.toString(),
          burnSteps: burnSteps.toString(), // Convert to string for logging
        });

        // Execute shrine interaction transaction
        const interactionTx = await client.actions.interactWithShrine(
          account as Account,
          shrineId,
          burnSteps
        );
        console.log("📥 Shrine interaction transaction:", interactionTx);

        if (!interactionTx || interactionTx.code !== "SUCCESS") {
          throw new Error(
            `Shrine interaction failed: ${
              interactionTx?.code || "Unknown error"
            }`
          );
        }

        // Update state with transaction hash
        setActionState((prev) => ({
          ...prev,
          txHash: interactionTx.transaction_hash,
        }));
        setLastTransaction(interactionTx.transaction_hash);

        // Wait for transaction processing
        console.log("⏳ Processing shrine interaction...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
         await refetchHealth();
        // await refetchPlayerStats();
        // await refetch();
        console.log("current health",health?.current);
        

        // Confirm transaction
        dojoState.confirmTransaction(transactionId);
       
        
          // Update final state
          setActionState({
            status: "success",
            error: null,
            txHash: interactionTx.transaction_hash,
          });
        setActionInProgress(false);
 
        console.log("🛕 Shrine interaction successful!", {
          stepsBurned: burnSteps.toString(),
        });

        return {
          success: true,
          transactionHash: interactionTx.transaction_hash,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to interact with shrine. Please try again.";

        console.error("❌ Shrine interaction error:", error);

        // Cleanup on error
        dojoState.revertOptimisticUpdate(transactionId);
        setActionState({ status: "error", error: errorMessage, txHash: null });
        setError(errorMessage);
        setActionInProgress(false);

        return { success: false, error: errorMessage };
      }
    },
    [
      isProcessing,
      actionInProgress,
      validateConnection,
      client,
      account,
      dojoState,
      setActionInProgress,
      setError,
      setLastTransaction,
      addShrineInteraction,
    ]
  );

  // Reset function
  const reset = useCallback(() => {
    console.log("🔄 Resetting shrine interaction state");
    setActionState({ status: "idle", error: null, txHash: null });
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
    status: actionState.status,
    error: actionState.error,
    txHash: actionState.txHash,
    isProcessing,
    isConnected: connectionStatus === "connected",
    canInteract: canInteractWithShrine(),
    availableSteps: gameStats?.currentSteps || 0, // Safe access

    // Actions
    interactWithShrine,
    reset,
  };
};
