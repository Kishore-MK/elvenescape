import { useEffect, useState, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { addAddressPadding } from "starknet";
import { dojoConfig } from "../dojoConfig";
import { Player, Inventory } from '../bindings';
import useAppStore from '../../zustand/store';

const TORII_URL = dojoConfig.toriiUrl + "/graphql";

// Player-specific query
const PLAYER_DATA_QUERY = `
  query GetPlayerData($playerAddress: ContractAddress!) {
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



// Player Data Hook
interface UsePlayerDataReturn {
  player: Player | null;
  isLoading: boolean;
  error: string | null;
  refetchPlayerStats: () => Promise<void>;
}

const fetchPlayerData = async (playerAddress: string) => {
  const response = await fetch(TORII_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      query: PLAYER_DATA_QUERY,
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

  const playerNode = data.kaadugamePlayerModels?.edges?.[0]?.node;

  return playerNode ? {
    player: playerAddress,
    steps: parseNumber(playerNode.steps),
    encounters: parseNumber(playerNode.encounters),
    ego: parseNumber(playerNode.ego),
    gatekeeper_kills: parseNumber(playerNode.gatekeeper_kills),
    deaths: parseNumber(playerNode.deaths),
    traps_triggered: parseNumber(playerNode.traps_triggered),
    cosmetics_unlocked: parseNumber(playerNode.cosmetics_unlocked),
    greed_marked: Boolean(playerNode.greed_marked)
  } as Player : null;
};

export const usePlayerData = (): UsePlayerDataReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { account } = useAccount();
  
  const {
    player,
    setPlayer,
    setLoading,
    setError: setStoreError
  } = useAppStore();

  const userAddress = account ? addAddressPadding(account.address).toLowerCase() : '';

  const refetchPlayerStats = useCallback(async () => {
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

      const playerData = await fetchPlayerData(userAddress);
      setPlayer(playerData);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch player data';
      setError(errorMsg);
      setStoreError(errorMsg);
      console.error("Error fetching player data:", err);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [userAddress, setPlayer, setLoading, setStoreError]);

  // Fetch data when address changes
  useEffect(() => {
    if (userAddress) {
      refetchPlayerStats();
    } else {
      setIsLoading(false);
      setLoading(false);
    }
  }, [userAddress, refetchPlayerStats]);

  // Reset when account disconnects
  useEffect(() => {
    if (!account) {
      setPlayer(null);
      setError(null);
      setIsLoading(false);
    }
  }, [account, setPlayer]);

  return {
    player,
    isLoading,
    error,
    refetchPlayerStats
  };
};
