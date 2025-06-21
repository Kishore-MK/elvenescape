import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum, ByteArray } from "starknet";
import * as models from "./models.gen";

export function setupWorld(provider: DojoProvider) {

	const build_actions_attackGatekeeper_calldata = (gatekeeperId: BigNumberish, damage: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "attack_gatekeeper",
			calldata: [gatekeeperId, damage],
		};
	};

	const actions_attackGatekeeper = async (snAccount: Account | AccountInterface, gatekeeperId: BigNumberish, damage: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_attackGatekeeper_calldata(gatekeeperId, damage),
				"kaadugame",
			);
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

	const build_actions_takeDamage_calldata = (damage: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "take_damage",
			calldata: [damage],
		};
	};

	const actions_takeDamage = async (snAccount: Account | AccountInterface, damage: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_takeDamage_calldata(damage),
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
			initializePlayer: actions_initializePlayer,
			buildInitializePlayerCalldata: build_actions_initializePlayer_calldata,
			interactWithShrine: actions_interactWithShrine,
			buildInteractWithShrineCalldata: build_actions_interactWithShrine_calldata,
			spawn: actions_spawn,
			buildSpawnCalldata: build_actions_spawn_calldata,
			stepForward: actions_stepForward,
			buildStepForwardCalldata: build_actions_stepForward_calldata,
			takeDamage: actions_takeDamage,
			buildTakeDamageCalldata: build_actions_takeDamage_calldata,
		},
	};
}