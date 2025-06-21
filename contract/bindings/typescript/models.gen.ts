import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { CairoOption, CairoOptionVariant, BigNumberish } from 'starknet';

// Type definition for `kaadugame::models::Gatekeeper` struct
export interface Gatekeeper {
	gatekeeper_id: BigNumberish;
	strength: BigNumberish;
	health: BigNumberish;
	max_health: BigNumberish;
	spawn_step: BigNumberish;
	position: BigNumberish;
}

// Type definition for `kaadugame::models::GatekeeperValue` struct
export interface GatekeeperValue {
	strength: BigNumberish;
	health: BigNumberish;
	max_health: BigNumberish;
	spawn_step: BigNumberish;
	position: BigNumberish;
}

// Type definition for `kaadugame::models::Health` struct
export interface Health {
	player: string;
	current: BigNumberish;
	max: BigNumberish;
}

// Type definition for `kaadugame::models::HealthValue` struct
export interface HealthValue {
	current: BigNumberish;
	max: BigNumberish;
}

// Type definition for `kaadugame::models::Inventory` struct
export interface Inventory {
	player: string;
	cosmetics: Array<BigNumberish>;
	blessings: Array<BigNumberish>;
}

// Type definition for `kaadugame::models::InventoryValue` struct
export interface InventoryValue {
	cosmetics: Array<BigNumberish>;
	blessings: Array<BigNumberish>;
}

// Type definition for `kaadugame::models::OverloadState` struct
export interface OverloadState {
	player: string;
	is_active: boolean;
	steps_remaining: BigNumberish;
}

// Type definition for `kaadugame::models::OverloadStateValue` struct
export interface OverloadStateValue {
	is_active: boolean;
	steps_remaining: BigNumberish;
}

// Type definition for `kaadugame::models::Player` struct
export interface Player {
	player: string;
	steps: BigNumberish;
	encounters: BigNumberish;
	ego: BigNumberish;
	gatekeeper_kills: BigNumberish;
	deaths: BigNumberish;
	traps_triggered: BigNumberish;
	cosmetics_unlocked: BigNumberish;
	greed_marked: boolean;
}

// Type definition for `kaadugame::models::PlayerValue` struct
export interface PlayerValue {
	steps: BigNumberish;
	encounters: BigNumberish;
	ego: BigNumberish;
	gatekeeper_kills: BigNumberish;
	deaths: BigNumberish;
	traps_triggered: BigNumberish;
	cosmetics_unlocked: BigNumberish;
	greed_marked: boolean;
}

// Type definition for `kaadugame::models::Position` struct
export interface Position {
	player: string;
	x: BigNumberish;
}

// Type definition for `kaadugame::models::PositionValue` struct
export interface PositionValue {
	x: BigNumberish;
}

// Type definition for `kaadugame::models::Shrine` struct
export interface Shrine {
	shrine_id: BigNumberish;
	blessing: BigNumberish;
	cosmetic: CairoOption<BigNumberish>;
	is_trap: boolean;
	is_active: boolean;
	position: BigNumberish;
}

// Type definition for `kaadugame::models::ShrineValue` struct
export interface ShrineValue {
	blessing: BigNumberish;
	cosmetic: CairoOption<BigNumberish>;
	is_trap: boolean;
	is_active: boolean;
	position: BigNumberish;
}

// Type definition for `kaadugame::models::StepCount` struct
export interface StepCount {
	player: string;
	count: BigNumberish;
}

// Type definition for `kaadugame::models::StepCountValue` struct
export interface StepCountValue {
	count: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::GatekeeperBattle` struct
export interface GatekeeperBattle {
	player: string;
	gatekeeper_id: BigNumberish;
	damage_dealt: BigNumberish;
	gatekeeper_defeated: boolean;
}

// Type definition for `kaadugame::systems::actions::actions::GatekeeperBattleValue` struct
export interface GatekeeperBattleValue {
	gatekeeper_id: BigNumberish;
	damage_dealt: BigNumberish;
	gatekeeper_defeated: boolean;
}

// Type definition for `kaadugame::systems::actions::actions::HealthDamage` struct
export interface HealthDamage {
	player: string;
	damage: BigNumberish;
	current_health: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::HealthDamageValue` struct
export interface HealthDamageValue {
	damage: BigNumberish;
	current_health: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::OverloadTriggered` struct
export interface OverloadTriggered {
	player: string;
	step_count: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::OverloadTriggeredValue` struct
export interface OverloadTriggeredValue {
	step_count: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::PlayerDeath` struct
export interface PlayerDeath {
	player: string;
	final_position: BigNumberish;
	cause: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::PlayerDeathValue` struct
export interface PlayerDeathValue {
	final_position: BigNumberish;
	cause: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::ShrineInteraction` struct
export interface ShrineInteraction {
	player: string;
	shrine_id: BigNumberish;
	steps_burned: BigNumberish;
	reward_received: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::ShrineInteractionValue` struct
export interface ShrineInteractionValue {
	shrine_id: BigNumberish;
	steps_burned: BigNumberish;
	reward_received: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::StepTaken` struct
export interface StepTaken {
	player: string;
	new_position: BigNumberish;
	step_count: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::StepTakenValue` struct
export interface StepTakenValue {
	new_position: BigNumberish;
	step_count: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::TrapTriggered` struct
export interface TrapTriggered {
	player: string;
	shrine_id: BigNumberish;
}

// Type definition for `kaadugame::systems::actions::actions::TrapTriggeredValue` struct
export interface TrapTriggeredValue {
	shrine_id: BigNumberish;
}

export interface SchemaType extends ISchemaType {
	kaadugame: {
		Gatekeeper: Gatekeeper,
		GatekeeperValue: GatekeeperValue,
		Health: Health,
		HealthValue: HealthValue,
		Inventory: Inventory,
		InventoryValue: InventoryValue,
		OverloadState: OverloadState,
		OverloadStateValue: OverloadStateValue,
		Player: Player,
		PlayerValue: PlayerValue,
		Position: Position,
		PositionValue: PositionValue,
		Shrine: Shrine,
		ShrineValue: ShrineValue,
		StepCount: StepCount,
		StepCountValue: StepCountValue,
		GatekeeperBattle: GatekeeperBattle,
		GatekeeperBattleValue: GatekeeperBattleValue,
		HealthDamage: HealthDamage,
		HealthDamageValue: HealthDamageValue,
		OverloadTriggered: OverloadTriggered,
		OverloadTriggeredValue: OverloadTriggeredValue,
		PlayerDeath: PlayerDeath,
		PlayerDeathValue: PlayerDeathValue,
		ShrineInteraction: ShrineInteraction,
		ShrineInteractionValue: ShrineInteractionValue,
		StepTaken: StepTaken,
		StepTakenValue: StepTakenValue,
		TrapTriggered: TrapTriggered,
		TrapTriggeredValue: TrapTriggeredValue,
	},
}
export const schema: SchemaType = {
	kaadugame: {
		Gatekeeper: {
			gatekeeper_id: 0,
			strength: 0,
			health: 0,
			max_health: 0,
			spawn_step: 0,
			position: 0,
		},
		GatekeeperValue: {
			strength: 0,
			health: 0,
			max_health: 0,
			spawn_step: 0,
			position: 0,
		},
		Health: {
			player: "",
			current: 0,
			max: 0,
		},
		HealthValue: {
			current: 0,
			max: 0,
		},
		Inventory: {
			player: "",
			cosmetics: [0],
			blessings: [0],
		},
		InventoryValue: {
			cosmetics: [0],
			blessings: [0],
		},
		OverloadState: {
			player: "",
			is_active: false,
			steps_remaining: 0,
		},
		OverloadStateValue: {
			is_active: false,
			steps_remaining: 0,
		},
		Player: {
			player: "",
			steps: 0,
			encounters: 0,
			ego: 0,
			gatekeeper_kills: 0,
			deaths: 0,
			traps_triggered: 0,
			cosmetics_unlocked: 0,
			greed_marked: false,
		},
		PlayerValue: {
			steps: 0,
			encounters: 0,
			ego: 0,
			gatekeeper_kills: 0,
			deaths: 0,
			traps_triggered: 0,
			cosmetics_unlocked: 0,
			greed_marked: false,
		},
		Position: {
			player: "",
			x: 0,
		},
		PositionValue: {
			x: 0,
		},
		Shrine: {
			shrine_id: 0,
			blessing: 0,
		cosmetic: new CairoOption(CairoOptionVariant.None),
			is_trap: false,
			is_active: false,
			position: 0,
		},
		ShrineValue: {
			blessing: 0,
		cosmetic: new CairoOption(CairoOptionVariant.None),
			is_trap: false,
			is_active: false,
			position: 0,
		},
		StepCount: {
			player: "",
			count: 0,
		},
		StepCountValue: {
			count: 0,
		},
		GatekeeperBattle: {
			player: "",
			gatekeeper_id: 0,
			damage_dealt: 0,
			gatekeeper_defeated: false,
		},
		GatekeeperBattleValue: {
			gatekeeper_id: 0,
			damage_dealt: 0,
			gatekeeper_defeated: false,
		},
		HealthDamage: {
			player: "",
			damage: 0,
			current_health: 0,
		},
		HealthDamageValue: {
			damage: 0,
			current_health: 0,
		},
		OverloadTriggered: {
			player: "",
			step_count: 0,
		},
		OverloadTriggeredValue: {
			step_count: 0,
		},
		PlayerDeath: {
			player: "",
			final_position: 0,
			cause: 0,
		},
		PlayerDeathValue: {
			final_position: 0,
			cause: 0,
		},
		ShrineInteraction: {
			player: "",
			shrine_id: 0,
			steps_burned: 0,
			reward_received: 0,
		},
		ShrineInteractionValue: {
			shrine_id: 0,
			steps_burned: 0,
			reward_received: 0,
		},
		StepTaken: {
			player: "",
			new_position: 0,
			step_count: 0,
		},
		StepTakenValue: {
			new_position: 0,
			step_count: 0,
		},
		TrapTriggered: {
			player: "",
			shrine_id: 0,
		},
		TrapTriggeredValue: {
			shrine_id: 0,
		},
	},
};
export enum ModelsMapping {
	Gatekeeper = 'kaadugame-Gatekeeper',
	GatekeeperValue = 'kaadugame-GatekeeperValue',
	Health = 'kaadugame-Health',
	HealthValue = 'kaadugame-HealthValue',
	Inventory = 'kaadugame-Inventory',
	InventoryValue = 'kaadugame-InventoryValue',
	OverloadState = 'kaadugame-OverloadState',
	OverloadStateValue = 'kaadugame-OverloadStateValue',
	Player = 'kaadugame-Player',
	PlayerValue = 'kaadugame-PlayerValue',
	Position = 'kaadugame-Position',
	PositionValue = 'kaadugame-PositionValue',
	Shrine = 'kaadugame-Shrine',
	ShrineValue = 'kaadugame-ShrineValue',
	StepCount = 'kaadugame-StepCount',
	StepCountValue = 'kaadugame-StepCountValue',
	GatekeeperBattle = 'kaadugame-GatekeeperBattle',
	GatekeeperBattleValue = 'kaadugame-GatekeeperBattleValue',
	HealthDamage = 'kaadugame-HealthDamage',
	HealthDamageValue = 'kaadugame-HealthDamageValue',
	OverloadTriggered = 'kaadugame-OverloadTriggered',
	OverloadTriggeredValue = 'kaadugame-OverloadTriggeredValue',
	PlayerDeath = 'kaadugame-PlayerDeath',
	PlayerDeathValue = 'kaadugame-PlayerDeathValue',
	ShrineInteraction = 'kaadugame-ShrineInteraction',
	ShrineInteractionValue = 'kaadugame-ShrineInteractionValue',
	StepTaken = 'kaadugame-StepTaken',
	StepTakenValue = 'kaadugame-StepTakenValue',
	TrapTriggered = 'kaadugame-TrapTriggered',
	TrapTriggeredValue = 'kaadugame-TrapTriggeredValue',
}