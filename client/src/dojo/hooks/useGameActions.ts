import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAccount } from "@starknet-react/core";
import { Account, BigNumberish } from "starknet";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { useStarknetConnect } from "./useStarknetConnect";
import useAppStore from "../../zustand/store";
import * as models from "../bindings";

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

// Hook for creating gatekeeper in store
export const useCreateGatekeeper = () => {
  const { updateGatekeeper } = useAppStore();

  const createGatekeeper = useCallback(
    (
      position: BigNumberish,
      health: BigNumberish = 100,
      damage: BigNumberish = 10
    ): string => {
      const gatekeeperId = generateRandomU64();

      const newGatekeeper: models.Gatekeeper = {
        gatekeeper_id: gatekeeperId,
        position: position,
        health: health,
        max_health: 100,
        strength: damage,
        spawn_step: position,
      };

      updateGatekeeper(newGatekeeper);
      console.log("🛡️ Created gatekeeper:", newGatekeeper);

      return gatekeeperId.toString();
    },
    [updateGatekeeper]
  );

  return { createGatekeeper };
};

// Hook for creating shrine in store
export const useCreateShrine = () => {
  const { updateShrine } = useAppStore();

  const createShrine = useCallback(
    (
      position: BigNumberish,
      blessing?: BigNumberish,
      cosmetic?: BigNumberish,
      isTrap: boolean = false
    ): string => {
      const shrineId = generateRandomU64();

      const newShrine: models.Shrine = {
        shrine_id: shrineId,
        position: position,
        blessing: blessing || 0,
        cosmetic: {
          isSome: () => cosmetic !== undefined,
          isNone: () => cosmetic === undefined,
          unwrap: () => cosmetic || 0,
        },
        is_active: true,
        is_trap: isTrap,
      };

      updateShrine(newShrine);
      console.log("🛕 Created shrine:", {
        id: shrineId,
        position,
        blessing,
        isTrap,
      });

      return shrineId.toString();
    },
    [updateShrine]
  );

  return { createShrine };
};

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

  // // Store state and actions
  // const {
  //   setActionInProgress,
  //   setError,
  //   setLastTransaction,
  //   addGatekeeperBattle,
  //   updateGatekeeper,
  //   canAttackGatekeeper,
  //   getGatekeeperAtPosition,
  //   player,
  //   position,
  //   gameStats,
  //   actionInProgress,
  // } = useAppStore();

  // // Local action state
  // const [actionState, setActionState] = useState<ActionState>({
  //   status: "idle",
  //   error: null,
  //   txHash: null,
  // });

  // // Get current gatekeeper based on player position
  // const getCurrentGatekeeper = useCallback(() => {
  //   console.log("before position check",position);
    
  //   if (!position) return null;
  //   return getGatekeeperAtPosition(Number(position.x));
  // }, [position, getGatekeeperAtPosition]);

  // // Validation helpers
  // const validateConnection = useCallback((): string | null => {
  //   if (connectionStatus !== "connected") {
  //     return "Wallet not connected. Please connect your wallet first.";
  //   }
  //   if (!account) {
  //     return "No account found. Please connect your wallet.";
  //   }
  //   if (!player) {
  //     return "Player not initialized";
  //   }
  //   return null;
  // }, [connectionStatus, account, player]);

  // const validateAttack = useCallback((): string | null => {
  //   if (!canAttackGatekeeper()) {
  //     return "Cannot attack gatekeeper at this time";
  //   }

  //   const currentGatekeeper = getCurrentGatekeeper();
    
  //   // if (!currentGatekeeper) {
  //   //   return "No gatekeeper found at current position";
  //   // }

  //   if (Number(currentGatekeeper?.health) <= 0) {
  //     return "Gatekeeper is already defeated";
  //   }

  //   return null;
  // }, [canAttackGatekeeper, getCurrentGatekeeper]);

  // const isProcessing = actionState.status === "processing";

  // Core attack function
  const attackGatekeeper = useCallback(async (): Promise<ActionResult> => {
    // if (isProcessing || actionInProgress) {
    //   return { success: false, error: "Action already in progress" };
    // }

    // const validationError = validateConnection();
    // if (validationError) {
    //   setActionState({
    //     status: "error",
    //     error: validationError,
    //     txHash: null,
    //   });
    //   return { success: false, error: validationError };
    // }

    // const attackError = validateAttack();
    // if (attackError) {
    //   setActionState({ status: "error", error: attackError, txHash: null });
    //   return { success: false, error: attackError };
    // }

    // const transactionId = uuidv4();
    // const currentGatekeeper = getCurrentGatekeeper()!;

    
    // const gatekeeperId = currentGatekeeper.gatekeeper_id;
    // const gatekeeperDamage=currentGatekeeper.max_health


    
    try {
      // Start processing
      // setActionState({ status: "processing", error: null, txHash: null });
      // setActionInProgress(true);
      // setError(null);

      // console.log("⚔️ Attacking gatekeeper...", {
      //   gatekeeperId: gatekeeperId.toString(),
      // });
      // console.log("currentGatekeeper ",gatekeeperId,
      //   gatekeeperDamage);
      // Execute attack transaction
      const gatekeeperId=5387629831708980;
      const gatekeeperDamage=100
      const attackTx = await client.actions.attackGatekeeper(
        account as Account,
        gatekeeperId,
        gatekeeperDamage
      );
      console.log("📥 Attack transaction:", attackTx);

      // if (!attackTx || attackTx.code !== "SUCCESS") {
      //   throw new Error(
      //     `Attack gatekeeper failed: ${attackTx?.code || "Unknown error"}`
      //   );
      // }

      // // Update state with transaction hash
      // setActionState((prev) => ({
      //   ...prev,
      //   txHash: attackTx.transaction_hash,
      // }));
      // setLastTransaction(attackTx.transaction_hash);

      // // Optimistic update
      // const damageDealt = Math.max(1, gameStats.currentEgo);
      // const newGatekeeperHealth = Math.max(
      //   0,
      //   Number(currentGatekeeper.health) - damageDealt
      // );
      // const gatekeeperDefeated = newGatekeeperHealth <= 0;

      // const battleEvent: models.GatekeeperBattle = {
      //   player: player?.player || "0x0",
      //   gatekeeper_id: currentGatekeeper.gatekeeper_id,
      //   damage_dealt: damageDealt,
      //   gatekeeper_defeated: gatekeeperDefeated,
      // };

      // addGatekeeperBattle(battleEvent);

      // const updatedGatekeeper: models.Gatekeeper = {
      //   ...currentGatekeeper,
      //   health: newGatekeeperHealth,
      // };
      // updateGatekeeper(updatedGatekeeper);

      // // Wait for transaction processing
      // console.log("⏳ Processing attack transaction...");
      // await new Promise((resolve) => setTimeout(resolve, 2000));

      // // Confirm transaction
      // dojoState.confirmTransaction(transactionId);

      // // Update final state
      // setActionState({
      //   status: "success",
      //   error: null,
      //   txHash: attackTx.transaction_hash,
      // });
      // setActionInProgress(false);

      // console.log("⚔️ Attack successful!", {
      //   damageDealt,
      //   newHealth: newGatekeeperHealth,
      //   defeated: gatekeeperDefeated,
      // });

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
      // dojoState.revertOptimisticUpdate(transactionId);
      // setActionState({ status: "error", error: errorMessage, txHash: null });
      // setError(errorMessage);
      // setActionInProgress(false);

      return { success: false, error: errorMessage };
    }
  }, [
    // isProcessing,
    // actionInProgress,
    // validateConnection,
    // validateAttack,
    client,
    account,
    // player,
    // gameStats,
    // getCurrentGatekeeper,
    dojoState,
    // setActionInProgress,
    // setError,
    // setLastTransaction,
    // addGatekeeperBattle,
    // updateGatekeeper,
  ]);

  // // Reset function
  // const reset = useCallback(() => {
  //   console.log("🔄 Resetting attack state");
  //   setActionState({ status: "idle", error: null, txHash: null });
  //   setError(null);
  //   setActionInProgress(false);
  // }, [setError, setActionInProgress]);

  // Auto-reset on connection change
  // useEffect(() => {
  //   if (connectionStatus !== "connected") {
  //     reset();
  //   }
  // }, [connectionStatus, reset]);

  return {
    // State
    // status: actionState.status,
    // error: actionState.error,
    // txHash: actionState.txHash,
    // isProcessing,
    // isConnected: connectionStatus === "connected",
    // canAttack: canAttackGatekeeper(),
    // currentGatekeeper: getCurrentGatekeeper(),

    // Actions
    attackGatekeeper,
    // reset,
  };
};

// Hook for interacting with shrine
export const useInteractWithShrine = () => {
  const { useDojoStore, client } = useDojoSDK();
  const dojoState = useDojoStore((state) => state);
  const { account } = useAccount();
  const { status: connectionStatus } = useStarknetConnect();

  // Store state and actions
  const {
    setActionInProgress,
    setError,
    setLastTransaction,
    addShrineInteraction,
    addTrapTrigger,
    updateShrine,
    setInventory,
    canInteractWithShrine,
    getShrineAtPosition,
    player,
    position,
    inventory,
    gameStats,
    actionInProgress,
  } = useAppStore();

  // Local action state
  // const [actionState, setActionState] = useState<ActionState>({
  //   status: "idle",
  //   error: null,
  //   txHash: null,
  // });

  // // Get current shrine based on player position
  // const getCurrentShrine = useCallback(() => {
  //   if (!position) return null;
  //   return getShrineAtPosition(Number(position.x));
  // }, [position, getShrineAtPosition]);

  // // Validation helpers
  // const validateConnection = useCallback((): string | null => {
  //   if (connectionStatus !== "connected") {
  //     return "Wallet not connected. Please connect your wallet first.";
  //   }
  //   if (!account) {
  //     return "No account found. Please connect your wallet.";
  //   }
  //   if (!player) {
  //     return "Player not initialized";
  //   }
  //   return null;
  // }, [connectionStatus, account, player]);

  // const validateInteraction = useCallback(
  //   (burnSteps: BigNumberish): string | null => {
  //     if (!canInteractWithShrine()) {
  //       return "Cannot interact with shrine at this time";
  //     }

  //     const currentShrine = getCurrentShrine();
  //     if (!currentShrine) {
  //       return "No shrine found at current position";
  //     }

  //     if (!currentShrine.is_active) {
  //       return "Shrine is not active";
  //     }

  //     const stepsToburn = Number(burnSteps);
  //     if (stepsToburn > gameStats.currentSteps) {
  //       return `Not enough steps. You have ${gameStats.currentSteps}, trying to burn ${stepsToburn}`;
  //     }

  //     return null;
  //   },
  //   [canInteractWithShrine, getCurrentShrine, gameStats]
  // );

  // const isProcessing = actionState.status === "processing";

  // Helper function to calculate recommended steps to burn
  // const getRecommendedStepsBurn = useCallback(() => {
  //   const currentShrine = getCurrentShrine();
  //   if (!currentShrine || !player) return 0;

  //   const recommendedBurn = Math.max(
  //     1,
  //     Math.floor(gameStats.currentSteps * 0.1)
  //   );
  //   return Math.min(recommendedBurn, gameStats.currentSteps);
  // }, [getCurrentShrine, player, gameStats]);

  // Core interact function
  const interactWithShrine = useCallback(
    async (burnSteps: BigNumberish): Promise<ActionResult> => {
      // if (isProcessing || actionInProgress) {
      //   return { success: false, error: "Action already in progress" };
      // }

      // const validationError = validateConnection();
      // if (validationError) {
      //   setActionState({
      //     status: "error",
      //     error: validationError,
      //     txHash: null,
      //   });
      //   return { success: false, error: validationError };
      // }

      // const interactionError = validateInteraction(burnSteps);
      // if (interactionError) {
      //   setActionState({
      //     status: "error",
      //     error: interactionError,
      //     txHash: null,
      //   });
      //   return { success: false, error: interactionError };
      // }

      const transactionId = uuidv4();
      // const currentShrine = getCurrentShrine()!;
      const shrineId = generateRandomU64();
      const burnStep=1;
      try {
        // Start processing
        // setActionState({ status: "processing", error: null, txHash: null });
        // setActionInProgress(true);
        // setError(null);

        console.log("🛕 Interacting with shrine...", {
          shrineId: shrineId.toString(),
          burnSteps: burnStep,
          // isTrap: currentShrine.is_trap,
        });

        // Execute shrine interaction transaction
        const interactionTx = await client.actions.interactWithShrine(
          account as Account,
          shrineId,
          burnStep
        );
        console.log("📥 Shrine interaction transaction:", interactionTx);

        // if (!interactionTx || interactionTx.code !== "SUCCESS") {
        //   throw new Error(
        //     `Shrine interaction failed: ${
        //       interactionTx?.code || "Unknown error"
        //     }`
        //   );
        // }

        // // Update state with transaction hash
        // setActionState((prev) => ({
        //   ...prev,
        //   txHash: interactionTx.transaction_hash,
        // }));
        // setLastTransaction(interactionTx.transaction_hash);

        // // Optimistic updates based on shrine data
        // if (currentShrine.is_trap) {
        //   // Handle trap interaction
        //   const trapEvent: models.TrapTriggered = {
        //     player: player?.player || "0x0",
        //     shrine_id: currentShrine.shrine_id,
        //   };
        //   addTrapTrigger(trapEvent);

        //   const interactionEvent: models.ShrineInteraction = {
        //     player: player?.player || "0x0",
        //     shrine_id: currentShrine.shrine_id,
        //     steps_burned: burnSteps,
        //     reward_received: 0,
        //   };
        //   addShrineInteraction(interactionEvent);
        // } else {
        //   // Handle normal shrine interaction
        //   let rewardReceived = Number(currentShrine.blessing || 0);

        //   if (currentShrine.cosmetic && currentShrine.cosmetic.isSome()) {
        //     rewardReceived = Number(currentShrine.cosmetic.unwrap());
        //   }

        //   const interactionEvent: models.ShrineInteraction = {
        //     player: player?.player || "0x0",
        //     shrine_id: currentShrine.shrine_id,
        //     steps_burned: burnSteps,
        //     reward_received: rewardReceived,
        //   };
        //   addShrineInteraction(interactionEvent);

        //   // Update inventory optimistically
        //   if (inventory) {
        //     const newInventory: models.Inventory = { ...inventory };

        //     if (currentShrine.blessing && Number(currentShrine.blessing) > 0) {
        //       newInventory.blessings = [
        //         ...newInventory.blessings,
        //         currentShrine.blessing,
        //       ];
        //     }
        //     let x :BigNumberish=0
        //     if (currentShrine.cosmetic && currentShrine.cosmetic.isSome()) {
        //       const cosmeticValue = currentShrine.cosmetic.unwrap();
        //       newInventory.cosmetics = [
        //         ...(newInventory.cosmetics || x),
        //         cosmeticValue || x,
        //       ];
        //     }

        //     setInventory(newInventory);
        //   }
        // }

        // Deactivate the shrine after interaction
        // const updatedShrine: models.Shrine = {
        //   ...currentShrine,
        //   is_active: false,
        // };
        // updateShrine(updatedShrine);

        // // Wait for transaction processing
        // console.log("⏳ Processing shrine interaction...");
        // await new Promise((resolve) => setTimeout(resolve, 2000));

        // // Confirm transaction
        // dojoState.confirmTransaction(transactionId);

        // // Update final state
        // setActionState({
        //   status: "success",
        //   error: null,
        //   txHash: interactionTx.transaction_hash,
        // });
        // setActionInProgress(false);

        console.log("🛕 Shrine interaction successful!", {
          // isTrap: currentShrine.is_trap,
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

        // console.error("❌ Shrine interaction error:", error);

        // // Cleanup on error
        // dojoState.revertOptimisticUpdate(transactionId);
        // setActionState({ status: "error", error: errorMessage, txHash: null });
        // setError(errorMessage);
        // setActionInProgress(false);

        return { success: false, error: errorMessage };
      }
    },
    [
      // isProcessing,
      actionInProgress,
      // validateConnection,
      // validateInteraction,
      client,
      account,
      player,
      inventory,
      gameStats,
      // getCurrentShrine,
      dojoState,
      setActionInProgress,
      setError,
      setLastTransaction,
      addShrineInteraction,
      addTrapTrigger,
      updateShrine,
      setInventory,
    ]
  );

  // Reset function
  // const reset = useCallback(() => {
  //   console.log("🔄 Resetting shrine interaction state");
  //   setActionState({ status: "idle", error: null, txHash: null });
  //   setError(null);
  //   setActionInProgress(false);
  // }, [setError, setActionInProgress]);

  // // Auto-reset on connection change
  // useEffect(() => {
  //   if (connectionStatus !== "connected") {
  //     reset();
  //   }
  // }, [connectionStatus, reset]);

  return {
  //   // State
  //   status: actionState.status,
  //   error: actionState.error,
  //   txHash: actionState.txHash,
  //   isProcessing,
  //   isConnected: connectionStatus === "connected",
  //   canInteract: canInteractWithShrine(),
  //   currentShrine: getCurrentShrine(),
  //   recommendedStepsBurn: getRecommendedStepsBurn(),
  //   availableSteps: gameStats.currentSteps,

  //   // Actions
    interactWithShrine,
  //   reset,
  };
};