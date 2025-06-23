import { useEffect, useState, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { addAddressPadding } from "starknet";
import { dojoConfig } from "../dojoConfig";
import { Health } from '../bindings';
import useAppStore from '../../zustand/store';

const TORII_URL = dojoConfig.toriiUrl + "/graphql";
 
// Health-specific query
const HEALTH_QUERY = `
  query GetHealth($playerAddress: ContractAddress!) {
    kaadugameHealthModels(where: { player: $playerAddress }) {
      edges {
        node {
          player
          current
          max
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

 

// Health Hook
interface UseHealthReturn {
  health: Health | null;
  isLoading: boolean;
  error: string | null;
  refetchHealth: () => Promise<void>;
}

const fetchHealthData = async (playerAddress: string) => {
  const response = await fetch(TORII_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      query: HEALTH_QUERY,
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

  const healthNode = data.kaadugameHealthModels?.edges?.[0]?.node;

  return healthNode ? {
    player: playerAddress,
    current: parseNumber(healthNode.current),
    max: parseNumber(healthNode.max)
  } as Health : null;
};

export const useHealth = (): UseHealthReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { account } = useAccount();
  
  const {
    health,
    setHealth,
    setLoading,
    setError: setStoreError
  } = useAppStore();

  const userAddress = account ? addAddressPadding(account.address).toLowerCase() : '';

  const refetchHealth = useCallback(async () => {
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

      const healthData = await fetchHealthData(userAddress);
      console.log("Haalth after interaction",healthData);
      
      setHealth(healthData);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch health data';
      setError(errorMsg);
      setStoreError(errorMsg);
      console.error("Error fetching health data:", err);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [userAddress, setHealth, setLoading, setStoreError]);

  // Fetch data when address changes
  useEffect(() => {
    if (userAddress) {
      refetchHealth();
    } else {
      setIsLoading(false);
      setLoading(false);
    }
  }, [userAddress, refetchHealth]);

  // Reset when account disconnects
  useEffect(() => {
    if (!account) {
      setHealth(null);
      setError(null);
      setIsLoading(false);
    }
  }, [account, setHealth]);

  return {
    health,
    isLoading,
    error,
    refetchHealth
  };
};