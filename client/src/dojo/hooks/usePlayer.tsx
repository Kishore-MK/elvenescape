import { useEffect, useState, useMemo } from "react";
import { useAccount } from "@starknet-react/core";
import { addAddressPadding, BigNumberish } from "starknet";
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
    console.log("Fetching player data for address:", playerAddress);
    
    const response = await fetch(TORII_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query: PLAYER_QUERY,
        variables: { playerAddress }
      }),
    });

    const result = await response.json();
    console.log("GraphQL response:", result);
    
    if (!result.data) {
      console.log("No data in response");
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

    console.log("Extracted data:", {
      player: playerData,
      position: positionData,
      stepCount: stepCountData,
      health: healthData,
      inventory: inventoryData,
      overload: overloadData,
      encounter: encounterData
    });

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
      encounter_type: hexToNumber(encounterData.encounter_type),
      entity_id: hexToNumber(encounterData.entity_id)
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
    
    console.log("Consolidated game state:", gameState);
    
    return gameState;
  } catch (error) {
    console.error("Error fetching player data:", error);
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

// Hook
export const usePlayer = (): UsePlayerReturn => {
  const [gameState, setGameState] = useState<PlayerGameState>({
    player: null,
    position: null,
    stepCount: null,
    health: null,
    inventory: null,
    overloadState: null,
    currentEncounter: null
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { account } = useAccount();
  
  // Get store state and actions
  const {
    // State
    player: storePlayer,
    position: storePosition,
    stepCount: storeStepCount,
    health: storeHealth,
    inventory: storeInventory,
    overloadState: storeOverloadState,
    currentEncounter: storeCurrentEncounter,
    gamePhase,
    isPlayerInitialized,
    canTakeStep,
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
    isInEncounter,
    updateHealth,
    updatePlayer
  } = useAppStore();

  // Memoize the formatted user address
  const userAddress = useMemo(() => 
    account ? addAddressPadding(account.address).toLowerCase() : '', 
    [account]
  );

  // Function to fetch and update player data
  const refetch = async () => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const playerGameState = await fetchPlayerData(userAddress);
      console.log("Player game state fetched:", playerGameState);
      
      // Update local state
      setGameState(playerGameState);

      // Determine appropriate game phase
      const newGamePhase = determineGamePhase(
        playerGameState.player,
        playerGameState.health,
        playerGameState.overloadState,
        playerGameState.currentEncounter,
        isPlayerInitialized
      );

      // Update Zustand store with comprehensive game logic
      if (playerGameState.player) {
        if (!isPlayerInitialized) {
          // Initialize player if not already initialized
          initializePlayer(playerGameState.player);
          console.log("Player initialized:", playerGameState.player);
        } else {
          // Update existing player data
          updatePlayer(playerGameState.player);
        }
      }

      // Update all game state
      setPosition(playerGameState.position);
      setStepCount(playerGameState.stepCount);
      setHealth(playerGameState.health);
      setInventory(playerGameState.inventory);
      setOverloadState(playerGameState.overloadState);
      setCurrentEncounter(playerGameState.currentEncounter);
      setGamePhase(newGamePhase);

      // Update step availability based on game state
      const newCanTakeStep = 
        newGamePhase === GamePhase.PLAYING && 
        playerGameState.health !== null && 
        Number(playerGameState.health.current) > 0 &&
        !playerGameState.overloadState?.is_active;
      console.log("can take step",newGamePhase === GamePhase.PLAYING, 
        playerGameState.health!== null,
        Number(playerGameState?.health?.current) > 0,
        !playerGameState.overloadState?.is_active,
        playerGameState.currentEncounter);
      
      setCanTakeStep(newCanTakeStep);

      console.log("Game state updated:", {
        phase: newGamePhase,
        canTakeStep: newCanTakeStep,
        isInEncounter: !!playerGameState.currentEncounter
      });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      console.error("Error in refetch:", error);
      setError(error);

      // Clear game state on error
      setGameState({
        player: null,
        position: null,
        stepCount: null,
        health: null,
        inventory: null,
        overloadState: null,
        currentEncounter: null
      });
      
      // Reset store state
      setGamePhase(GamePhase.UNINITIALIZED);
      setPlayerInitialized(false);
      setCanTakeStep(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch player data when address changes
  useEffect(() => {
    if (userAddress) {
      console.log("Address changed, refetching player data for:", userAddress);
      refetch();
    }
  }, [userAddress]);

  // Effect to handle account disconnection
  useEffect(() => {
    if (!account) {
      console.log("No account, clearing all player data");
      
      // Clear local state
      setGameState({
        player: null,
        position: null,
        stepCount: null,
        health: null,
        inventory: null,
        overloadState: null,
        currentEncounter: null
      });
      
      // Reset store to initial state
      setGamePhase(GamePhase.UNINITIALIZED);
      setPlayerInitialized(false);
      setCanTakeStep(false);
      setCurrentEncounter(null);
      setOverloadState(null);
      setHealth(null);
      setInventory(null);
      setPosition(null);
      setStepCount(null);
      
      setError(null);
      setIsLoading(false);
    }
  }, [account]);

  // Return combined state from store and local state
  return {
    // Prioritize store data when available, fallback to local state
    player: storePlayer || gameState.player,
    position: storePosition || gameState.position,
    stepCount: storeStepCount || gameState.stepCount,
    health: storeHealth || gameState.health,
    inventory: storeInventory || gameState.inventory,
    overloadState: storeOverloadState || gameState.overloadState,
    currentEncounter: storeCurrentEncounter || gameState.currentEncounter,
    
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