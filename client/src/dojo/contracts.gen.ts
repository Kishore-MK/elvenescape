import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum, ByteArray } from "starknet";
import * as models from "./bindings";

export function setupWorld(provider: DojoProvider) {

	const build_actions_attackGatekeeper_calldata = (gatekeeperId: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "attack_gatekeeper",
			calldata: [gatekeeperId],
		};
	};

	const actions_attackGatekeeper = async (snAccount: Account | AccountInterface, gatekeeperId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_attackGatekeeper_calldata(gatekeeperId),
				"kaadugame",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_getEncounter_calldata = (player: string): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "get_encounter",
			calldata: [player],
		};
	};

	const actions_getEncounter = async (player: string) => {
		try {
			return await provider.call("kaadugame", build_actions_getEncounter_calldata(player));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_initializePlayer_calldata = (): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "initialize_player",
			calldata: [],
		};
	};

	const actions_initializePlayer = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_initializePlayer_calldata(),
				"kaadugame",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_interactWithShrine_calldata = (shrineId: BigNumberish, burnSteps: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "interact_with_shrine",
			calldata: [shrineId, burnSteps],
		};
	};

	const actions_interactWithShrine = async (snAccount: Account | AccountInterface, shrineId: BigNumberish, burnSteps: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_interactWithShrine_calldata(shrineId, burnSteps),
				"kaadugame",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_spawn_calldata = (): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "spawn",
			calldata: [],
		};
	};

	const actions_spawn = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_spawn_calldata(),
				"kaadugame",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_stepForward_calldata = (): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "step_forward",
			calldata: [],
		};
	};

	const actions_stepForward = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_stepForward_calldata(),
				"kaadugame",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};



	return {
		actions: {
			attackGatekeeper: actions_attackGatekeeper,
			buildAttackGatekeeperCalldata: build_actions_attackGatekeeper_calldata,
			getEncounter: actions_getEncounter,
			buildGetEncounterCalldata: build_actions_getEncounter_calldata,
			initializePlayer: actions_initializePlayer,
			buildInitializePlayerCalldata: build_actions_initializePlayer_calldata,
			interactWithShrine: actions_interactWithShrine,
			buildInteractWithShrineCalldata: build_actions_interactWithShrine_calldata,
			spawn: actions_spawn,
			buildSpawnCalldata: build_actions_spawn_calldata,
			stepForward: actions_stepForward,
			buildStepForwardCalldata: build_actions_stepForward_calldata,
		},
	};
}