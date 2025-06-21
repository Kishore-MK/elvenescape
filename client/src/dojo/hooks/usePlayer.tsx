import { useEffect, useState, useMemo, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { addAddressPadding } from "starknet";
import { dojoConfig } from "../dojoConfig";
import { 
  Player, 
  Position, 
  StepCount, 
  Health,
  Inventory, 
  OverloadState,
  CurrentEncounter
} from '../bindings';
import useAppStore, { GamePhase, EncounterType } from '../../zustand/store';

// Types
interface UsePlayerReturn {
  player: Player | null;
  position: Position | null;
  stepCount: StepCount | null;
  health: Health | null;
  inventory: Inventory | null;
  overloadState: OverloadState | null;
  currentEncounter: CurrentEncounter | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  // Game state helpers
  gamePhase: GamePhase;
  canTakeStep: boolean;
  isInEncounter: boolean;
  isPlayerInitialized: boolean;
}

// Extended player data interface combining all game state
interface PlayerGameState {
  player: Player | null;
  position: Position | null;
  stepCount: StepCount | null;
  health: Health | null;
  inventory: Inventory | null;
  overloadState: OverloadState | null;
  currentEncounter: CurrentEncounter | null;
}

// Constants
const TORII_URL = dojoConfig.toriiUrl + "/graphql";

const PLAYER_QUERY = `
  query GetPlayer($playerAddress: ContractAddress!) {
    kaadugamePlayerModels(where: {player: $playerAddress}) {
      edges {
        node {
          player
          steps
          encounters
          ego
          gatekeeper_kills
          deaths
          traps_triggered
          cosmetics_unlocked
          greed_marked
        }
      }
    }
    kaadugamePositionModels(where: { player: $playerAddress }) {
      edges {
        node {
          player
          x
        }
      }
    }
    kaadugameStepCountModels(where: { player: $playerAddress }) {
      edges {
        node {
          player
          count
        }
      }
    }
    kaadugameHealthModels(where: { player: $playerAddress }) {
      edges {
        node {
          player
          current
          max
        }
      }
    }
    kaadugameInventoryModels(where: { player: $playerAddress }) {
      edges {
        node {
          player
          cosmetics
          blessings
        }
      }
    }
    kaadugameOverloadStateModels(where: { player: $playerAddress }) {
      edges {
        node {
          player
          is_active
          steps_remaining
        }
      }
    }
    kaadugameCurrentEncounterModels(where: { player: $playerAddress }) {
      edges {
        node {
          player
          encounter_type
          entity_id
        }
      }
    }
  }
`;

// Helper to convert hex strings/BigNumberish to numbers
const hexToNumber = (hexValue: any): number => {
  if (typeof hexValue === 'number') return hexValue;
  if (typeof hexValue === 'string' && hexValue.startsWith('0x')) {
    return parseInt(hexValue, 16);
  }
  if (typeof hexValue === 'string') {
    return parseInt(hexValue, 10);
  }
  return 0;
};

// Helper to convert hex arrays to number arrays
const hexArrayToNumbers = (hexArray: any[]): number[] => {
  if (!Array.isArray(hexArray)) return [];
  return hexArray.map(hexToNumber);
};

// API Functions
const fetchPlayerData = async (playerAddress: string): Promise<PlayerGameState> => {
  try {
    console.log("🔍 Fetching player data for address:", playerAddress);
    
    const response = await fetch(TORII_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query: PLAYER_QUERY,
        variables: { playerAddress }
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }
    
    if (!result.data) {
      console.log("📭 No data in response");
      return {
        player: null,
        position: null,
        stepCount: null,
        health: null,
        inventory: null,
        overloadState: null,
        currentEncounter: null
      };
    }

    const data = result.data;
    
    // Extract data from each model
    const playerData = data.kaadugamePlayerModels?.edges?.[0]?.node;
    const positionData = data.kaadugamePositionModels?.edges?.[0]?.node;
    const stepCountData = data.kaadugameStepCountModels?.edges?.[0]?.node;
    const healthData = data.kaadugameHealthModels?.edges?.[0]?.node;
    const inventoryData = data.kaadugameInventoryModels?.edges?.[0]?.node;
    const overloadData = data.kaadugameOverloadStateModels?.edges?.[0]?.node;
    const encounterData = data.kaadugameCurrentEncounterModels?.edges?.[0]?.node;

    // Build Player object
    const player: Player | null = playerData ? {
      player: playerAddress,
      steps: hexToNumber(playerData.steps),
      encounters: hexToNumber(playerData.encounters),
      ego: hexToNumber(playerData.ego),
      gatekeeper_kills: hexToNumber(playerData.gatekeeper_kills),
      deaths: hexToNumber(playerData.deaths),
      traps_triggered: hexToNumber(playerData.traps_triggered),
      cosmetics_unlocked: hexToNumber(playerData.cosmetics_unlocked),
      greed_marked: Boolean(playerData.greed_marked)
    } : null;

    // Build Position object
    const position: Position | null = positionData ? {
      player: playerAddress,
      x: hexToNumber(positionData.x)
    } : null;

    // Build StepCount object
    const stepCount: StepCount | null = stepCountData ? {
      player: playerAddress,
      count: hexToNumber(stepCountData.count)
    } : null;

    // Build Health object
    const health: Health | null = healthData ? {
      player: playerAddress,
      current: Number(healthData.current),
      max: Number(healthData.max)
    } : null;

    // Build Inventory object
    const inventory: Inventory | null = inventoryData ? {
      player: playerAddress,
      cosmetics: hexArrayToNumbers(inventoryData.cosmetics || []),
      blessings: hexArrayToNumbers(inventoryData.blessings || [])
    } : null;

    // Build OverloadState object
    const overloadState: OverloadState | null = overloadData ? {
      player: playerAddress,
      is_active: Boolean(overloadData.is_active),
      steps_remaining: hexToNumber(overloadData.steps_remaining)
    } : null;

    // Build CurrentEncounter object
    const currentEncounter: CurrentEncounter | null = encounterData ? {
      player: playerAddress,
      encounter_type: Number(encounterData.encounter_type),
      entity_id: Number(encounterData.entity_id),
      position: Number(encounterData?.position)
    } : null;

    const gameState: PlayerGameState = {
      player,
      position,
      stepCount,
      health,
      inventory,
      overloadState,
      currentEncounter
    };
    
    console.log("📦 Consolidated game state:", gameState);
    
    return gameState;
  } catch (error) {
    console.error("❌ Error fetching player data:", error);
    throw error;
  }
};

// Helper function to determine game phase based on player data
const determineGamePhase = (
  player: Player | null,
  health: Health | null,
  overloadState: OverloadState | null,
  currentEncounter: CurrentEncounter | null,
  isPlayerInitialized: boolean
): GamePhase => {
  // Check if player is dead
  if (health && Number(health.current) <= 0) {
    return GamePhase.DEAD;
  }
  
  // Check if player is in overload
  if (overloadState?.is_active) {
    return GamePhase.OVERLOAD;
  }
  
  // Check if player has an active encounter
  if (currentEncounter && currentEncounter.encounter_type !== EncounterType.NONE) {
    return GamePhase.ENCOUNTER;
  }
  
  // Check if player exists but not initialized in store
  if (player && !isPlayerInitialized) {
    return GamePhase.INITIALIZING;
  }
  
  // Check if player exists and is playing
  if (player && isPlayerInitialized) {
    return GamePhase.PLAYING;
  }
  
  // Default state
  return GamePhase.UNINITIALIZED;
};

// Helper to determine if player can take steps
const determineCanTakeStep = (
  gamePhase: GamePhase,
  health: Health | null,
  overloadState: OverloadState | null,
  actionInProgress: boolean
): boolean => {
  return (
    gamePhase === GamePhase.PLAYING &&
    health !== null &&
    Number(health.current) > 0 &&
    !overloadState?.is_active &&
    !actionInProgress
  );
};

// Hook
export const usePlayer = (): UsePlayerReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { account } = useAccount();
  
  // Get store state and actions
  const {
    // State
    player,
    position,
    stepCount,
    health,
    inventory,
    overloadState,
    currentEncounter,
    gamePhase,
    isPlayerInitialized,
    canTakeStep,
    actionInProgress,
    
    // Actions
    initializePlayer,
    setPosition,
    setStepCount,
    setHealth,
    setInventory,
    setOverloadState,
    setCurrentEncounter,
    setGamePhase,
    setPlayerInitialized,
    setCanTakeStep,
    setLoading,
    setError: setStoreError,
    resetStore,
    
    // Utility functions
    isInEncounter
  } = useAppStore();

  // Memoize the formatted user address
  const userAddress = useMemo(() => 
    account ? addAddressPadding(account.address).toLowerCase() : '', 
    [account]
  );

  // Function to fetch and update player data
  const refetch = useCallback(async () => {
    if (!userAddress) {
      setIsLoading(false);
      setLoading(false);
      return;
    }

    try {
      console.log("🔄 Refetching player data for:", userAddress);
      setIsLoading(true);
      setLoading(true);
      setError(null);
      setStoreError(null);

      const playerGameState = await fetchPlayerData(userAddress);
      
      // Determine appropriate game phase
      const newGamePhase = determineGamePhase(
        playerGameState.player,
        playerGameState.health,
        playerGameState.overloadState,
        playerGameState.currentEncounter,
        isPlayerInitialized
      );

      // Update Zustand store with fetched data
      if (playerGameState.player) {
        if (!isPlayerInitialized) {
          // Initialize player if not already initialized
          initializePlayer(playerGameState.player);
          console.log("🎮 Player initialized:", playerGameState.player);
        } else {
          // The store's initializePlayer will handle updates if player already exists
          initializePlayer(playerGameState.player);
        }
      }

      // Update all game state components
      setPosition(playerGameState.position);
      setStepCount(playerGameState.stepCount);
      setHealth(playerGameState.health);
      setInventory(playerGameState.inventory);
      setOverloadState(playerGameState.overloadState);
      setCurrentEncounter(playerGameState.currentEncounter);
      setGamePhase(newGamePhase);

      // Update step availability based on comprehensive game state
      const newCanTakeStep = determineCanTakeStep(
        newGamePhase,
        playerGameState.health,
        playerGameState.overloadState,
        actionInProgress
      );
      
      setCanTakeStep(newCanTakeStep);

      console.log("🎯 Game state updated:", {
        phase: newGamePhase,
        canTakeStep: newCanTakeStep,
        isInEncounter: !!playerGameState.currentEncounter,
        isAlive: playerGameState.health ? Number(playerGameState.health.current) > 0 : false,
        isOverloaded: playerGameState.overloadState?.is_active || false
      });

    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error occurred');
      console.error("❌ Error in refetch:", errorObj);
      setError(errorObj);
      setStoreError(errorObj.message);
      
      // Don't reset store state on fetch error - keep existing optimistic state
      // Only reset if it's a critical error (like auth failure)
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [
    userAddress, 
    isPlayerInitialized, 
    actionInProgress,
    initializePlayer,
    setPosition,
    setStepCount,
    setHealth,
    setInventory,
    setOverloadState,
    setCurrentEncounter,
    setGamePhase,
    setCanTakeStep,
    setLoading,
    setStoreError
  ]);

  // Effect to fetch player data when address changes
  useEffect(() => {
    if (userAddress) {
      console.log("🔗 Address changed, refetching player data for:", userAddress);
      refetch();
    } else {
      // Clear loading state when no address
      setIsLoading(false);
      setLoading(false);
    }
  }, [userAddress, refetch]);

  // Effect to handle account disconnection
  useEffect(() => {
    if (!account) {
      console.log("🔌 No account connected, resetting all player data");
      
      // Reset store to initial state
      resetStore();
      
      // Clear local error state
      setError(null);
      setIsLoading(false);
    }
  }, [account, resetStore]);

  // Effect to sync canTakeStep when relevant state changes
  useEffect(() => {
    const newCanTakeStep = determineCanTakeStep(
      gamePhase,
      health,
      overloadState,
      actionInProgress
    );
    
    if (newCanTakeStep !== canTakeStep) {
      setCanTakeStep(newCanTakeStep);
    }
  }, [gamePhase, health, overloadState, actionInProgress, canTakeStep, setCanTakeStep]);

  // Return state from store (single source of truth)
  return {
    // All data comes from store
    player,
    position,
    stepCount,
    health,
    inventory,
    overloadState,
    currentEncounter,
    
    // Loading and error state
    isLoading,
    error,
    refetch,
    
    // Game state helpers from store
    gamePhase,
    canTakeStep,
    isInEncounter: isInEncounter(),
    isPlayerInitialized
  };
};