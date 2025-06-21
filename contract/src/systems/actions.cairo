use kaadugame::models::{
    BlessingType, CosmeticType, CurrentEncounter, EntityLookupTrait, Gatekeeper, GatekeeperTrait, 
    Health, HealthTrait, Inventory, OverloadState, Player, PlayerTrait, Position, PositionTrait, 
    Shrine, StepCount,
};
use starknet::{ContractAddress};

// define the interface
#[starknet::interface]
pub trait IActions<T> {
    fn initialize_player(ref self: T);
    fn spawn(ref self: T);
    fn step_forward(ref self: T);
    fn interact_with_shrine(ref self: T, shrine_id: felt252, burn_steps: u64);
    fn attack_gatekeeper(ref self: T, gatekeeper_id: felt252);
    fn get_encounter(self: @T, player: ContractAddress) -> (u8, felt252);
}

// dojo decorator
#[dojo::contract]
pub mod actions {
    use dojo::event::EventStorage;
    use dojo::model::{Model, ModelStorage};
    use dojo::world::WorldStorage;
    use starknet::{ContractAddress, get_block_number, get_caller_address, get_block_timestamp};
    use super::{
        BlessingType, CosmeticType, CurrentEncounter, EntityLookupTrait, Gatekeeper, GatekeeperTrait, 
        Health, HealthTrait, IActions, Inventory, OverloadState, Player, PlayerTrait, Position, 
        PositionTrait, Shrine, StepCount,
    };

    // ===== EVENTS =====

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct StepTaken {
        #[key]
        pub player: ContractAddress,
        pub new_position: u64,
        pub step_count: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct EncounterFound {
        #[key]
        pub player: ContractAddress,
        pub encounter_type: u8, // 0=none, 1=gatekeeper, 2=shrine
        pub entity_id: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct OverloadTriggered {
        #[key]
        pub player: ContractAddress,
        pub step_count: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PlayerDeath {
        #[key]
        pub player: ContractAddress,
        pub final_position: u64,
        pub cause: felt252, // 'trap', 'health_depletion', 'gatekeeper'
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GatekeeperBattle {
        #[key]
        pub player: ContractAddress,
        pub gatekeeper_id: felt252,
        pub damage_dealt: u64,
        pub gatekeeper_defeated: bool,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct ShrineInteraction {
        #[key]
        pub player: ContractAddress,
        pub shrine_id: felt252,
        pub steps_burned: u64,
        pub reward_received: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TrapTriggered {
        #[key]
        pub player: ContractAddress,
        pub shrine_id: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct HealthDamage {
        #[key]
        pub player: ContractAddress,
        pub damage: u32,
        pub current_health: u32,
    }

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn initialize_player(ref self: ContractState) {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Check if player already exists
            let existing_player: Player = world.read_model(player);
            if existing_player.steps > 0 || existing_player.encounters > 0 {
                return; // Player already initialized
            }

            // Initialize permanent player data
            let inventory = Inventory { player, cosmetics: array![], blessings: array![] };
            let player_stats = Player {
                player,
                steps: 0,
                encounters: 0,
                ego: 100, // Starting ego
                gatekeeper_kills: 0,
                deaths: 0,
                traps_triggered: 0,
                cosmetics_unlocked: 0,
                greed_marked: false,
            };

            // Write permanent components to world
            world.write_model(@inventory);
            world.write_model(@player_stats);
        }

        fn spawn(ref self: ContractState) {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Initialize session components
            let position = Position { player, x: 1 };
            let step_count = StepCount { player, count: 0 };
            let overload_state = OverloadState { player, is_active: false, steps_remaining: 0 };
            let current_encounter = CurrentEncounter { 
                player, 
                encounter_type: 0, // 0 = none
                entity_id: 0,
                position: 0,
            };
            let health = Health { player, current: 100, max: 100 };

            // Write session components to world
            world.write_model(@position);
            world.write_model(@step_count);
            world.write_model(@overload_state);
            world.write_model(@current_encounter);
            world.write_model(@health);
        }

        fn step_forward(ref self: ContractState) {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Read player state
            let mut position: Position = world.read_model(player);
            let mut step_count: StepCount = world.read_model(player);
            let mut player_stats: Player = world.read_model(player);
            let mut health: Health = world.read_model(player);
            let mut current_encounter: CurrentEncounter = world.read_model(player);

            // Verify player exists and is alive
            if position.x == 0 || health.is_dead() {
                return;
            }

            // Check if player has an active encounter that hasn't been resolved
            if current_encounter.encounter_type == 1 { // gatekeeper
                // Player takes damage for not attacking gatekeeper
                let damage = 40;
                health.take_damage(damage);
                
                world.emit_event(@HealthDamage { 
                    player, 
                    damage, 
                    current_health: health.current 
                });

                if health.is_dead() {
                    self.handle_player_death(ref world, player, position.x, 'health_depletion');
                    return;
                }
            }

            // Update position and step count
            position.advance();
            step_count.count += 1;
            player_stats.add_step();

            // Check for overload trigger
            if position.is_overload_step(step_count) {
                self.trigger_overload(ref world, player, step_count.count);
            }

            // Check for position-based encounters
            let encounter_result = self.check_position_encounter(ref world, player, position.x, current_encounter.position);

            // Update current encounter
            current_encounter.encounter_type = encounter_result.encounter_type;
            current_encounter.entity_id = encounter_result.entity_id;
            if encounter_result.encounter_type != 0 {
                current_encounter.position = position.x;
            }

            // Write updated state
            world.write_model(@position);
            world.write_model(@step_count);
            world.write_model(@player_stats);
            world.write_model(@health);
            world.write_model(@current_encounter);

            // Emit events
            world.emit_event(@StepTaken { 
                player, 
                new_position: position.x, 
                step_count: step_count.count 
            });

            if encounter_result.encounter_type != 0 {
                world.emit_event(@EncounterFound {
                    player,
                    encounter_type: encounter_result.encounter_type,
                    entity_id: encounter_result.entity_id,
                });
            }
        }

        fn interact_with_shrine(ref self: ContractState, shrine_id: felt252, burn_steps: u64) {
            let mut world = self.world_default();
            let player = get_caller_address();

            let mut shrine: Shrine = world.read_model(shrine_id);
            let mut step_count: StepCount = world.read_model(player);
            let mut player_stats: Player = world.read_model(player);
            let mut inventory: Inventory = world.read_model(player);
            let mut current_encounter: CurrentEncounter = world.read_model(player);
            let position: Position = world.read_model(player);

            // Verify shrine exists, is active, and player has current encounter with this shrine
            if !shrine.is_active || current_encounter.encounter_type != 2 || current_encounter.entity_id != shrine_id {
                return;
            }

            // Check if it's a trap - instant death
            if shrine.is_trap {
                player_stats.mark_greed();
                self.handle_player_death(ref world, player, position.x, 'trap');
                
                world.emit_event(@TrapTriggered { player, shrine_id });
                return;
            }

            // Verify player has enough steps
            if step_count.count < burn_steps {
                return;
            }

            // Burn steps
            step_count.count -= burn_steps;

            inventory.blessings.append(shrine.blessing);

            // Maybe add cosmetic
            let reward = match shrine.cosmetic {
                Option::Some(cosmetic) => {
                    inventory.cosmetics.append(cosmetic);
                    cosmetic
                },
                Option::None => shrine.blessing,
            };

            // Deactivate shrine
            shrine.is_active = false;

            // Clear current encounter
            current_encounter.encounter_type = 0; // none
            current_encounter.entity_id = 0;
            current_encounter.position = 0;

            // Update state
            world.write_model(@shrine);
            world.write_model(@step_count);
            world.write_model(@player_stats);
            world.write_model(@inventory);
            world.write_model(@current_encounter);

            world.emit_event(@ShrineInteraction {
                player, 
                shrine_id, 
                steps_burned: burn_steps, 
                reward_received: reward,
            });
        }

        fn attack_gatekeeper(ref self: ContractState, gatekeeper_id: felt252) {
            let mut world = self.world_default();
            let player = get_caller_address();

            let mut gatekeeper: Gatekeeper = world.read_model(gatekeeper_id);
            let mut player_stats: Player = world.read_model(player);
            let mut current_encounter: CurrentEncounter = world.read_model(player);

            // Verify gatekeeper exists and player has current encounter with this gatekeeper
            if current_encounter.encounter_type != 1 || current_encounter.entity_id != gatekeeper_id {
                return;
            }

            // Calculate damage based on ego
            let damage = (player_stats.ego / 10).try_into().unwrap_or(10_u64);
            gatekeeper.take_damage(damage);

            let gatekeeper_defeated = gatekeeper.is_dead();

            if gatekeeper_defeated {
                player_stats.add_gatekeeper_kill();
                player_stats.add_encounter();
                
                // Clear current encounter
                current_encounter.encounter_type = 0; // none
                current_encounter.entity_id = 0;
                current_encounter.position = 0;
            }

            world.write_model(@gatekeeper);
            world.write_model(@player_stats);
            world.write_model(@current_encounter);

            world.emit_event(@GatekeeperBattle {
                player,
                gatekeeper_id,
                damage_dealt: damage,
                gatekeeper_defeated,
            });
        }

        fn get_encounter(self: @ContractState, player: ContractAddress) -> (u8, felt252) {
            let world = self.world_default();
            let current_encounter: CurrentEncounter = world.read_model(player);
            (current_encounter.encounter_type, current_encounter.entity_id)
        }
    }

    // ===== INTERNAL IMPLEMENTATIONS =====

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"kaadugame")
        }

        fn trigger_overload(
            self: @ContractState, ref world: WorldStorage, player: ContractAddress, step_count: u64,
        ) {
            let overload_state = OverloadState {
                player, 
                is_active: true, 
                steps_remaining: 77 // Overload lasts 77 steps
            };

            world.write_model(@overload_state);
            world.emit_event(@OverloadTriggered { player, step_count });
        }

        fn check_position_encounter(
            self: @ContractState, 
            ref world: WorldStorage, 
            player: ContractAddress, 
            player_pos: u64,
            last_encounter_pos: u64,
        ) -> EncounterResult {
            // Check if we should spawn a new entity at this position
            let spawn_pos = player_pos + 15;
            
            // Only spawn if we're at the right distance from last encounter
            if !EntityLookupTrait::validate_spawn_distance(spawn_pos, last_encounter_pos) {
                return EncounterResult { encounter_type: 0, entity_id: 0 };
            }

            // Determine what type of entity to spawn based on position
            let roll = get_block_timestamp() % 100;
            
            if roll < 20 { // 20% chance for shrine
                let shrine_id = self.spawn_shrine(ref world, spawn_pos);
                EncounterResult { encounter_type: 2, entity_id: shrine_id } // 2 = shrine
            } else if roll < 70 { // 50% chance for gatekeeper
                let gatekeeper_id = self.spawn_gatekeeper(ref world, spawn_pos);
                EncounterResult { encounter_type: 1, entity_id: gatekeeper_id } // 1 = gatekeeper
            } else {
                EncounterResult { encounter_type: 0, entity_id: 0 } // 0 = none
            }
        }

        fn spawn_shrine(self: @ContractState, ref world: WorldStorage, position: u64) -> felt252 {
            let shrine_id = position + 2000;
            let shrine_id_felt: felt252 = shrine_id.into();

            // 70% chance of trap
            let trap_roll = get_block_timestamp() % 100;
            let is_trap = trap_roll < 70;

            let shrine = Shrine {
                shrine_id: shrine_id_felt,
                blessing: BlessingType::Luck.into(),
                cosmetic: if is_trap { Option::None } else { Option::Some(CosmeticType::Hat.into()) },
                is_trap,
                is_active: true,
                position,
            };

            world.write_model(@shrine);
            shrine_id_felt
        }

        fn spawn_gatekeeper(self: @ContractState, ref world: WorldStorage, position: u64) -> felt252 {
            let gatekeeper_id = position + 3000;
            let gatekeeper_id_felt: felt252 = gatekeeper_id.into();
            
            let base_health = 80 + (position % 40);
            let gatekeeper = Gatekeeper {
                gatekeeper_id: gatekeeper_id_felt,
                strength: 75 + (position % 50),
                health: base_health,
                max_health: base_health,
                spawn_step: position,
                position,
            };

            world.write_model(@gatekeeper);
            gatekeeper_id_felt
        }
 
        fn handle_player_death(
            self: @ContractState, 
            ref world: WorldStorage, 
            player: ContractAddress, 
            final_position: u64,
            cause: felt252,
        ) {
            let mut player_stats: Player = world.read_model(player);
            let mut current_encounter: CurrentEncounter = world.read_model(player);
            let mut health: Health = world.read_model(player);
            
            health.current = 0;
            player_stats.add_death();
            
            // Clear any active encounter
            current_encounter.encounter_type = 0; // none
            current_encounter.entity_id = 0;
            current_encounter.position = 0;
            
            world.write_model(@health);
            world.write_model(@player_stats);
            world.write_model(@current_encounter);

            world.emit_event(@PlayerDeath { 
                player, 
                final_position, 
                cause 
            });
        }
    }

    // Helper struct for encounter results
    #[derive(Copy, Drop)]
    struct EncounterResult {
        encounter_type: u8,
        entity_id: felt252,
    }
}