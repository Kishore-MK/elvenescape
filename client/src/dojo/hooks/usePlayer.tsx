import { useEffect, useState, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { addAddressPadding } from "starknet";
import { dojoConfig } from "../dojoConfig";
import { 
  Player, 
  Position, 
  StepCount, 
  Health,
  Inventory, 
  OverloadState
} from '../bindings';
import useAppStore, { GamePhase } from '../../zustand/store';

interface UsePlayerReturn {
  player: Player | null;
  position: Position | null;
  stepCount: StepCount | null;
  health: Health | null;
  inventory: Inventory | null;
  overloadState: OverloadState | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  gamePhase: GamePhase;
  canTakeStep: boolean;
  isPlayerInitialized: boolean;
}

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
  }
`;

// Utility functions
const parseNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    return value.startsWith('0x') ? parseInt(value, 16) : parseInt(value, 10);
  }
  return 0;
};

const parseNumberArray = (arr: any[]): number[] => {
  return Array.isArray(arr) ? arr.map(parseNumber) : [];
};

const fetchPlayerData = async (playerAddress: string) => {
  const response = await fetch(TORII_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      query: PLAYER_QUERY,
      variables: { playerAddress }
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
  }

  const data = result.data;
  if (!data) return null;
console.log("graphQl",data);

  // Extract nodes from GraphQL response
  const playerNode = data.kaadugamePlayerModels?.edges?.[0]?.node;
  const positionNode = data.kaadugamePositionModels?.edges?.[0]?.node;
  const stepCountNode = data.kaadugameStepCountModels?.edges?.[0]?.node;
  const healthNode = data.kaadugameHealthModels?.edges?.[0]?.node;
  const inventoryNode = data.kaadugameInventoryModels?.edges?.[0]?.node;
  const overloadNode = data.kaadugameOverloadStateModels?.edges?.[0]?.node;

  return {
    player: playerNode ? {
      player: playerAddress,
      steps: parseNumber(playerNode.steps),
      encounters: parseNumber(playerNode.encounters),
      ego: parseNumber(playerNode.ego),
      gatekeeper_kills: parseNumber(playerNode.gatekeeper_kills),
      deaths: parseNumber(playerNode.deaths),
      traps_triggered: parseNumber(playerNode.traps_triggered),
      cosmetics_unlocked: parseNumber(playerNode.cosmetics_unlocked),
      greed_marked: Boolean(playerNode.greed_marked)
    } as Player : null,

    position: positionNode ? {
      player: playerAddress,
      x: parseNumber(positionNode.x)
    } as Position : null,

    stepCount: stepCountNode ? {
      player: playerAddress,
      count: parseNumber(stepCountNode.count)
    } as StepCount : null,

    health: healthNode ? {
      player: playerAddress,
      current: parseNumber(healthNode.current),
      max: parseNumber(healthNode.max)
    } as Health : null,

    inventory: inventoryNode ? {
      player: playerAddress,
      cosmetics: parseNumberArray(inventoryNode.cosmetics || []),
      blessings: parseNumberArray(inventoryNode.blessings || [])
    } as Inventory : null,

    overloadState: overloadNode ? {
      player: playerAddress,
      is_active: Boolean(overloadNode.is_active),
      steps_remaining: parseNumber(overloadNode.steps_remaining)
    } as OverloadState : null
  };
};

export const usePlayer = (): UsePlayerReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { account } = useAccount();
  
  // Store state and actions
  const {
    player,
    position,
    stepCount,
    health,
    inventory,
    overloadState,
    gamePhase,
    isPlayerInitialized, 
    setPlayer,
    setPosition,
    setStepCount,
    setHealth,
    setInventory,
    setOverloadState,
    setLoading,
    setError: setStoreError,
    canTakeStep,
    resetGame
  } = useAppStore();

  const userAddress = account ? addAddressPadding(account.address).toLowerCase() : '';

  const refetch = useCallback(async () => {
    if (!userAddress) {
      setIsLoading(false);
      setLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoading(true);
      setError(null);
      setStoreError(null);

      const data = await fetchPlayerData(userAddress);
      
      if (data) {
        // Update store with fetched data
        setPlayer(data.player);
        setPosition(data.position);
        setStepCount(data.stepCount);
        setHealth(data.health);
        setInventory(data.inventory);
        setOverloadState(data.overloadState);
      } else {
        // No player data found - reset to initial state
        setPlayer(null);
        setPosition(null);
        setStepCount(null);
        setHealth(null);
        setInventory(null);
        setOverloadState(null);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch player data';
      setError(errorMsg);
      setStoreError(errorMsg);
      console.error("Error fetching player data:", err);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [userAddress, setPlayer, setPosition, setStepCount, setHealth, setInventory, setOverloadState, setLoading, setStoreError]);

  // Fetch data when address changes
  useEffect(() => {
    if (userAddress) {
      refetch();
    } else {
      setIsLoading(false);
      setLoading(false);
    }
  }, [userAddress, refetch]);

  // Reset when account disconnects
  useEffect(() => {
    if (!account) {
      resetGame();
      setError(null);
      setIsLoading(false);
    }
  }, [account, resetGame]);

  return {
    player,
    position,
    stepCount,
    health,
    inventory,
    overloadState,
    isLoading,
    error,
    refetch,
    gamePhase,
    canTakeStep: canTakeStep(),
    isPlayerInitialized
  };
};