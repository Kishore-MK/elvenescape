import { useEffect, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { addAddressPadding } from "starknet";
import { dojoConfig } from "../dojoConfig";
import useAppStore from "../../zustand/store";
import { CurrentEncounter } from "../bindings";
 
const TORII_URL = dojoConfig.toriiUrl + "/graphql";

const CURRENT_ENCOUNTER_QUERY = `
  query GetCurrentEncounter($playerAddress: ContractAddress!) {
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

const hexToNumber = (hexValue: any): number => {
  if (typeof hexValue === "number") return hexValue;
  if (typeof hexValue === "string" && hexValue.startsWith("0x")) {
    return parseInt(hexValue, 16);
  }
  if (typeof hexValue === "string") {
    return parseInt(hexValue, 10);
  }
  return 0;
};

const hexToString = (hex: string): string => {
  if (!hex) return "";
  try {
    return BigInt(hex).toString();
  } catch {
    return "";
  }
};

export const useCurrentEncounter = () => {
  const { account } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setCurrentEncounter = useAppStore(state => state.setCurrentEncounter);

  const userAddress = account ? addAddressPadding(account.address).toLowerCase() : "";

  const refetch = async () => {
    if (!userAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(TORII_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: CURRENT_ENCOUNTER_QUERY,
          variables: { playerAddress: userAddress }
        })
      });

      const result = await response.json();

      const encounterData = result?.data?.kaadugameCurrentEncounterModels?.edges?.[0]?.node;
      if (encounterData) {
        const encounter: CurrentEncounter = {
          player: userAddress,
          encounter_type: parseInt(hexToString(encounterData.encounter_type)),
          entity_id: parseInt(hexToString(encounterData.entity_id))
        };
        console.log("Current Encounter:", encounter);
        
    }
      const currentEncounter: CurrentEncounter | null = encounterData ? {
        player: userAddress,
        encounter_type: hexToNumber(encounterData.encounter_type),
        entity_id: hexToNumber(encounterData.entity_id)
      } : null;

      setCurrentEncounter(currentEncounter);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      setCurrentEncounter(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      refetch();
    }
  }, [userAddress]);

  return {
    isLoading,
    error,
    refetch
  };
};
