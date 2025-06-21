use starknet::{ContractAddress};

// ===== PLAYER CORE COMPONENTS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Position {
    #[key]
    pub player: ContractAddress,
    pub x: u64, // position on the bridge
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct StepCount {
    #[key]
    pub player: ContractAddress,
    pub count: u64,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct OverloadState {
    #[key]
    pub player: ContractAddress,
    pub is_active: bool,
    pub steps_remaining: u32,
}

#[derive(Drop, Serde, Debug)]
#[dojo::model]
pub struct Inventory {
    #[key]
    pub player: ContractAddress,
    pub cosmetics: Array<felt252>,
    pub blessings: Array<felt252>,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Health {
    #[key]
    pub player: ContractAddress,
    pub current: u32,
    pub max: u32,
}

// ===== SCORE SYSTEM =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Player {
    #[key]
    pub player: ContractAddress,
    pub steps: u64,
    pub encounters: u64,
    pub ego: u64,
    pub gatekeeper_kills: u32,
    pub deaths: u32,
    pub traps_triggered: u32,
    pub cosmetics_unlocked: u32,
    pub greed_marked: bool,
}

// ===== ENCOUNTER ENTITIES =====

#[derive(Drop, Serde, Debug)]
#[dojo::model]
pub struct Shrine {
    #[key]
    pub shrine_id: felt252, // unique identifier for this shrine
    pub blessing: felt252,
    pub cosmetic: Option<felt252>,
    pub is_trap: bool,
    pub is_active: bool,
    pub position: u64,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Gatekeeper {
    #[key]
    pub gatekeeper_id: felt252, // unique identifier for this gatekeeper
    pub strength: u64,
    pub health: u64,
    pub max_health: u64,
    pub spawn_step: u64,
    pub position: u64,
}

// ===== ENUMS =====

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum BlessingType {
    Speed,
    Luck,
    Wisdom,
    Courage,
    Greed,
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum CosmeticType {
    Hat,
    Cloak,
    Weapon,
    Aura,
    Badge,
}

// ===== TRAIT IMPLEMENTATIONS =====

impl BlessingTypeIntoFelt252 of Into<BlessingType, felt252> {
    fn into(self: BlessingType) -> felt252 {
        match self {
            BlessingType::Speed => 1,
            BlessingType::Luck => 2,
            BlessingType::Wisdom => 3,
            BlessingType::Courage => 4,
            BlessingType::Greed => 5,
        }
    }
}

impl CosmeticTypeIntoFelt252 of Into<CosmeticType, felt252> {
    fn into(self: CosmeticType) -> felt252 {
        match self {
            CosmeticType::Hat => 1,
            CosmeticType::Cloak => 2,
            CosmeticType::Weapon => 3,
            CosmeticType::Aura => 4,
            CosmeticType::Badge => 5,
        }
    }
}

// ===== HELPER IMPLEMENTATIONS =====

#[generate_trait]
pub impl PositionImpl of PositionTrait {
    fn is_overload_step(self: Position, step_count: StepCount) -> bool {
        step_count.count % 777 == 0
    }
    
    fn advance(ref self: Position) {
        self.x += 1;
    }
}

#[generate_trait]
pub impl PlayerImpl of PlayerTrait {
    fn add_step(ref self: Player) {
        self.steps += 1;
    }
    
    fn add_encounter(ref self: Player) {
        self.encounters += 1;
    }
    
    fn add_death(ref self: Player) {
        self.deaths += 1;
    }
    
    fn mark_greed(ref self: Player) {
        self.greed_marked = true;
        self.traps_triggered += 1;
    }

    fn add_gatekeeper_kill(ref self: Player) {
        self.gatekeeper_kills += 1;
        self.ego += 15; // Boost ego on gatekeeper kill
    }
}

#[generate_trait]
pub impl HealthImpl of HealthTrait {
    fn take_damage(ref self: Health, damage: u32) {
        if damage >= self.current {
            self.current = 0;
        } else {
            self.current -= damage;
        }
    }

    fn heal(ref self: Health, amount: u32) {
        self.current += amount;
        if self.current > self.max {
            self.current = self.max;
        }
    }

    fn is_dead(self: Health) -> bool {
        self.current == 0
    }
}

#[generate_trait]
pub impl GatekeeperImpl of GatekeeperTrait {
    fn take_damage(ref self: Gatekeeper, damage: u64) {
        if damage >= self.health {
            self.health = 0;
        } else {
            self.health -= damage;
        }
    }

    fn is_dead(self: Gatekeeper) -> bool {
        self.health == 0
    }
}

// ===== TESTS =====

#[cfg(test)]
mod tests {
    use super::{Position, StepCount, PositionTrait, Health, HealthTrait};
    use starknet::contract_address_const;

    #[test]
    fn test_overload_step_detection() {
        let position = Position { 
            player: contract_address_const::<0x123>(), 
            x: 1000 
        };
        let step_count = StepCount { 
            player: contract_address_const::<0x123>(), 
            count: 777 
        };
        
        assert(position.is_overload_step(step_count), 'should be overload step');
    }
    
    #[test]
    fn test_position_advance() {
        let mut position = Position { 
            player: contract_address_const::<0x123>(), 
            x: 100 
        };
        
        position.advance();
        assert(position.x == 101, 'position should advance');
    }

    #[test]
    fn test_health_damage() {
        let mut health = Health { 
            player: contract_address_const::<0x123>(), 
            current: 100,
            max: 100
        };
        
        health.take_damage(30);
        assert(health.current == 70, 'health should reduce');
        assert(!health.is_dead(), 'should not be dead');
        
        health.take_damage(80);
        assert(health.current == 0, 'health should be zero');
        assert(health.is_dead(), 'should be dead');
    }
}