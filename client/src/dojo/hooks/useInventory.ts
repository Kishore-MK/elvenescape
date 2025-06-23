import { useEffect, useState, useMemo } from "react";
import { useAccount } from "@starknet-react/core";
import { addAddressPadding } from "starknet";
import useAppStore from "../../zustand/store";
import { dojoConfig } from "../dojoConfig";

const INVENTORY_QUERY = `
  query GetInventory($playerAddress: ContractAddress!) {
    kaadugameInventoryModels(where: { player: $playerAddress }) {
      edges {
        node {
          player
          cosmetics
          blessings
        }
      }
    }
  }
`;

const hexArrayToNumbers = (hexArray:any) => {
  if (!Array.isArray(hexArray)) return [];
  return hexArray.map(hex => parseInt(hex, 16));
};

export const useInventory = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { account } = useAccount();
  const setInventory = useAppStore(state => state.setInventory);
  const inventory = useAppStore(state => state.inventory);

  const playerAddress = useMemo(() =>
    account ? addAddressPadding(account.address).toLowerCase() : '',
    [account]
  );

  const fetchInventory = async () => {
    if (!playerAddress) return;
console.log("Fetching Inventory...");

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${dojoConfig.toriiUrl}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: INVENTORY_QUERY,
          variables: { playerAddress },
        }),
      });

      const result = await response.json();
      const node = result?.data?.kaadugameInventoryModels?.edges?.[0]?.node;

      if (node) {
        setInventory({
          player: playerAddress,
          cosmetics: hexArrayToNumbers(node.cosmetics || []),
          blessings: hexArrayToNumbers(node.blessings || [])
        });
      } else {
        setInventory(null);
      }
    }catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error occurred');
    console.error("Error in refetch:", error);
    setError(error);
      setInventory(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (playerAddress) fetchInventory();
  }, [playerAddress]);

  return {
    inventory,
    isLoading,
    error,
    refetch: fetchInventory
  };
};
