import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import useAppStore from "../../zustand/store";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { dojoConfig } from "../dojoConfig";

export function useAttackGatekeeper() {
    const { account, status } = useAccount();
    const { client } = useDojoSDK();
    const encounter = useAppStore((state) => state.currentEncounter);
    const [attackGatekeeperState, setAttackGatekeeperState] = useState({
        isLoading: false,
        error: "",
        txStatus: "",
        txHash: null,
    });

    const canAttack = !!account && !!encounter?.entity_id;

    const executeAttackGatekeeper = async () => {
        if (!account || !encounter) return;

        try {
            setAttackGatekeeperState({
                isLoading: true,
                error: "null",
                txStatus: "",
                txHash: null,
            });
            const tx = await client.actions.attackGatekeeper(
                account,
                encounter.entity_id
            );
            setAttackGatekeeperState({
                isLoading: false,
                error: "null",
                txStatus: "SUCCESS",
                txHash: tx.transaction_hash,
            });
        } catch (error) {
            setAttackGatekeeperState({
                isLoading: false,
                error: error instanceof Error ? error.message : "Unknown error",
                txStatus: "",
                txHash: null,
            });
        }
    };

    return { attackGatekeeperState, executeAttackGatekeeper, canAttack };
}

export function useInteractWithShrine() {
    const { account, status } = useAccount();
    const { client } = useDojoSDK();
    const encounter = useAppStore((state) => state.currentEncounter);
    const stepCount = useAppStore((state) => state.stepCount);
    const setInventory = useAppStore((state) => state.setInventory);
    const [interactWithShrineState, setInteractWithShrineState] = useState({
        isLoading: false,
        error: "",
        txStatus: "",
        txHash: null,
    });

    const canInteract =
        !!account && !!stepCount?.count && !!encounter?.entity_id;

    const executeInteractWithShrine = async () => {
        if (!account || !stepCount || !encounter) return;

        try {
            setInteractWithShrineState({
                isLoading: true,
                error: "null",
                txStatus: "",
                txHash: null,
            });
            const tx = await client.actions.interactWithShrine(
                account,
                encounter.entity_id,
                BigInt(Number(stepCount.count)-10)
            );
            setInteractWithShrineState({
                isLoading: false,
                error: "null",
                txStatus: "SUCCESS",
                txHash: tx.transaction_hash,
            });

            // Recheck inventory and other effects
            const updatedInventory = await fetchInventory(account.address);
            setInventory(updatedInventory);
        } catch (error) {
            setInteractWithShrineState({
                isLoading: false,
                error: error instanceof Error ? error.message : "Unknown error",
                txStatus: "null",
                txHash: null,
            });
        }
    };

    return { interactWithShrineState, executeInteractWithShrine, canInteract };
}

async function fetchInventory(playerAddress: string) {
    const TORII_URL = dojoConfig.toriiUrl + "/graphql";

    const PLAYER_QUERY = `
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

   
        try {
            console.log("Fetching Inventory data for address:", playerAddress);

            const response = await fetch(TORII_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: PLAYER_QUERY,
                    variables: { playerAddress },
                }),
            });

            const result = await response.json();
            console.log("GraphQL response:", result);

            if (!result.data) {
                console.log("No data in response");
                return {
                    inventory: null,
                };
            }

            const data = await result.data;
            const inventoryNode =await data.kaadugameInventoryModels?.edges?.[0]?.node
            console.log("GraphQL data:", inventoryNode);
            return inventoryNode
            
        } catch (error) {
            console.error("Error fetching inventory:", error);
            return {
                inventory: null,
            };
        }
    }
 
