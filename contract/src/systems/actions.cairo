use kaadugame::models::{
    BlessingType, CosmeticType, Gatekeeper, GatekeeperTrait, 
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
    fn take_damage(ref self: T, damage: u32);
    fn attack_gatekeeper(ref self: T, gatekeeper_id: u64,damage:u64);
    fn interact_with_shrine(ref self: T, shrine_id: u64, burn_steps: u64);
}

// dojo decorator
#[dojo::contract]
pub mod actions {
    use dojo::event::EventStorage;
    use dojo::model::{Model, ModelStorage};
    use dojo::world::WorldStorage;
    use starknet::{ContractAddress, get_block_number, get_caller_address, get_block_timestamp};
    use super::{
        BlessingType, CosmeticType, Gatekeeper, GatekeeperTrait, 
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
        pub cause: felt252, // 'damage', 'trap'
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GatekeeperBattle {
        #[key]
        pub player: ContractAddress,
        pub gatekeeper_id: u64,
        pub damage_dealt: u64,
        pub gatekeeper_defeated: bool,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct ShrineInteraction {
        #[key]
        pub player: ContractAddress,
        pub shrine_id: u64,
        pub steps_burned: u64,
        pub reward_received: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TrapTriggered {
        #[key]
        pub player: ContractAddress,
        pub shrine_id: u64,
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
            let health = Health { player, current: 100, max: 100 };

            // Write session components to world
            world.write_model(@position);
            world.write_model(@step_count);
            world.write_model(@overload_state);
            world.write_model(@health);
        }

        fn step_forward(ref self: ContractState) {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Read player state
            let mut position: Position = world.read_model(player);
            let mut step_count: StepCount = world.read_model(player);
            let mut player_stats: Player = world.read_model(player);
            let health: Health = world.read_model(player);

            // Verify player exists and is alive
            if position.x == 0 || health.is_dead() {
                return;
            }

            // Update position and step count
            position.advance();
            step_count.count += 1;
            player_stats.add_step();

            // Check for overload trigger
            if position.is_overload_step(step_count) {
                self.trigger_overload(ref world, player, step_count.count);
            }

            // Write updated state
            world.write_model(@position);
            world.write_model(@step_count);
            world.write_model(@player_stats);

            // Emit event
            world.emit_event(@StepTaken { 
                player, 
                new_position: position.x, 
                step_count: step_count.count 
            });
        }

        fn take_damage(ref self: ContractState, damage: u32) {
            let mut world = self.world_default();
            let player = get_caller_address();

            let mut health: Health = world.read_model(player);
            let position: Position = world.read_model(player);

            // Verify player exists and is alive
            if health.is_dead() {
                return;
            }

            health.take_damage(damage);

            world.emit_event(@HealthDamage { 
                player, 
                damage, 
                current_health: health.current 
            });

            if health.is_dead() {
                self.handle_player_death(ref world, player, position.x, 'damage');
            }

            world.write_model(@health);
        }

        fn attack_gatekeeper(ref self: ContractState, gatekeeper_id: u64,damage:u64) {
            let mut world = self.world_default();
            let player = get_caller_address();

            let player_stats: Player = world.read_model(player);
                        
            let mut gatekeeper = self.create_gatekeeper(gatekeeper_id);
            

            // Verify gatekeeper is alive
            if gatekeeper.is_dead() {
                return;
            }
 
            gatekeeper.take_damage(damage);

            let gatekeeper_defeated = gatekeeper.is_dead();

            if gatekeeper_defeated {
                // Mark gatekeeper as defeated by setting health to 0
                // Dojo doesn't have delete_model, so we keep the defeated gatekeeper in storage
                world.write_model(@gatekeeper);
                
                // Update player stats
                let mut updated_player_stats = player_stats;
                updated_player_stats.add_gatekeeper_kill();
                world.write_model(@updated_player_stats);
            } else {
                // Keep gatekeeper alive in storage
                world.write_model(@gatekeeper);
            }

            world.emit_event(@GatekeeperBattle {
                player,
                gatekeeper_id,
                damage_dealt: damage,
                gatekeeper_defeated,
            });
        }

        fn interact_with_shrine(ref self: ContractState, shrine_id: u64, burn_steps: u64) {
            let mut world = self.world_default();
            let player = get_caller_address();

            let mut step_count: StepCount = world.read_model(player);
            let mut player_stats: Player = world.read_model(player);
            let mut inventory: Inventory = world.read_model(player);
            let health: Health = world.read_model(player);
            let position: Position = world.read_model(player);

            // Verify player is alive
            if health.is_dead() {
                return;
            }

            // Verify player has enough steps
            if step_count.count < burn_steps {
                return;
            }
 
            let mut shrine = self.create_shrine(shrine_id);
            

           

            // Check if it's a trap - instant death
            if shrine.is_trap {
                player_stats.mark_greed();
                world.write_model(@player_stats);
                
                // Mark shrine as consumed by setting is_active to false
                shrine.is_active = false;
                world.write_model(@shrine);
                
                self.handle_player_death(ref world, player, position.x, 'trap');
                
                world.emit_event(@TrapTriggered { player, shrine_id });
                return;
            }

            // Burn steps
            step_count.count -= burn_steps;
            player_stats.steps -=burn_steps;
            // Give rewards
            inventory.blessings.append(shrine.blessing);
            
            let reward = match shrine.cosmetic {
                Option::Some(cosmetic) => {
                    inventory.cosmetics.append(cosmetic);
                    cosmetic
                },
                Option::None => shrine.blessing,
            };

            // Update player stats
            player_stats.add_encounter();

            // Mark shrine as consumed by setting is_active to false
            shrine.is_active = false;

            // Update state
            world.write_model(@step_count);
            world.write_model(@player_stats);
            world.write_model(@inventory);
            world.write_model(@shrine);

            world.emit_event(@ShrineInteraction {
                player, 
                shrine_id, 
                steps_burned: burn_steps, 
                reward_received: reward,
            });
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

        fn create_gatekeeper(self: @ContractState, gatekeeper_id: u64) -> Gatekeeper {
            let gatekeeper_id_felt: felt252 = gatekeeper_id.into();
            
            // Generate stats based on ID for consistency
            let base_health = 100;
            Gatekeeper {
                gatekeeper_id: gatekeeper_id_felt,
                strength: 40,
                health: base_health,
                max_health: base_health,
                spawn_step: gatekeeper_id,
                position: gatekeeper_id,
            }
        }

        fn create_shrine(self: @ContractState, shrine_id: u64) -> Shrine {
            let shrine_id_felt: felt252 = shrine_id.into();

            // Generate trap chance based on ID for consistency
            let trap_roll = shrine_id % 100;
            let is_trap = trap_roll < 70; // 70% chance of trap

            Shrine {
                shrine_id: shrine_id_felt,
                blessing: BlessingType::Luck.into(),
                cosmetic: if is_trap { Option::None } else { Option::Some(CosmeticType::Hat.into()) },
                is_trap,
                is_active: true,
                position: shrine_id,
            }
        }
 
        fn handle_player_death(
            self: @ContractState, 
            ref world: WorldStorage, 
            player: ContractAddress, 
            final_position: u64,
            cause: felt252,
        ) {
            let mut player_stats: Player = world.read_model(player);
            let mut health: Health = world.read_model(player);
            
            health.current = 0;
            player_stats.add_death();
            
            world.write_model(@health);
            world.write_model(@player_stats);

            world.emit_event(@PlayerDeath { 
                player, 
                final_position, 
                cause 
            });
        }
    }
}