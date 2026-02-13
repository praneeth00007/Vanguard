#![no_std]

//! Vanguard Hub Contract
//!
//! Game logic hub for Vanguard's Blindside ZK game.
//! Manages game state, commitments, HP, vehicle types, cooldowns, and turn order.
//! Coordinates with separate verifier contracts for each action type (movement, attack, scan).

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec, Address, Bytes, Env, IntoVal, Symbol,
    Vec,
};

/// Game state storage
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Player 1 address
    P1Address,
    /// Player 2 address
    P2Address,
    /// Player 1 commitment hash (Poseidon(x, y, salt))
    P1Hash,
    /// Player 2 commitment hash (Poseidon(x, y, salt))
    P2Hash,
    /// Player 1 HP (starts at 3)
    P1Hp,
    /// Player 2 HP (starts at 3)
    P2Hp,
    /// Player 1 vehicle type
    P1VehicleType,
    /// Player 2 vehicle type
    P2VehicleType,
    /// Player 1 cooldown (turns)
    P1Cooldown,
    /// Player 2 cooldown (turns)
    P2Cooldown,
    /// Number of turns completed (for replay prevention)
    TurnCounter,
    /// Game active flag
    GameActive,
    /// Verifier contract addresses
    MovementVerifier,
    AttackVerifier,
    ScanVerifier,
}

/// Player identifiers
const PLAYER_1: u32 = 1;
const PLAYER_2: u32 = 2;
const INITIAL_HP: u32 = 3;

/// Vehicle type identifiers
const VEHICLE_CYCLE: u32 = 0;
const VEHICLE_ROVER: u32 = 1;
const VEHICLE_TANK: u32 = 2;

/// Event emitted when a move is executed
#[contracttype]
pub struct MoveEvent {
    pub player: u32,
    pub turn: u64,
}

/// Event emitted when an attack is executed
#[contracttype]
pub struct AttackEvent {
    pub attacker: u32,
    pub hit: bool,
    pub turn: u64,
}

/// Event emitted when a scan is executed
#[contracttype]
pub struct ScanEvent {
    pub scanner: u32,
    pub turn: u64,
}

/// Event emitted when game ends
#[contracttype]
pub struct GameOverEvent {
    pub winner: u32,
}

#[contract]
pub struct VanguardHubContract;

#[contractimpl]
impl VanguardHubContract {
    /// Initialize a new game between two players.
    ///
    /// # Arguments
    /// * `p1` - Address of player 1
    /// * `p2` - Address of player 2
    /// * `p1_vehicle_type` - Vehicle type for player 1 (0-2)
    /// * `p2_vehicle_type` - Vehicle type for player 2 (0-2)
    /// * `movement_verifier` - Address of movement verifier contract
    /// * `attack_verifier` - Address of attack verifier contract
    /// * `scan_verifier` - Address of scan verifier contract
    ///
    /// # Requirements
    /// * Game must not already be initialized
    /// * Players must be different
    /// * Vehicle types must be in range
    ///
    /// # Sets
    /// * Player addresses
    /// * HP to 3 for both players
    /// * Vehicle types
    /// * Cooldowns to 0
    /// * Turn counter to 0
    /// * Game active to true
    /// * Verifier contract addresses
    pub fn initialize_game(
        env: Env,
        p1: Address,
        p2: Address,
        p1_vehicle_type: u32,
        p2_vehicle_type: u32,
        movement_verifier: Address,
        attack_verifier: Address,
        scan_verifier: Address,
    ) {
        // Check game is not already initialized
        if Self::get_game_active(&env) {
            panic!("Game already initialized");
        }

        // Require different players
        if p1 == p2 {
            panic!("Players must be different");
        }

        Self::require_valid_vehicle_type(p1_vehicle_type);
        Self::require_valid_vehicle_type(p2_vehicle_type);

        // Store player addresses
        env.storage().instance().set(&DataKey::P1Address, &p1);
        env.storage().instance().set(&DataKey::P2Address, &p2);

        // Initialize HP
        env.storage().instance().set(&DataKey::P1Hp, &INITIAL_HP);
        env.storage().instance().set(&DataKey::P2Hp, &INITIAL_HP);

        // Store vehicle types
        env.storage()
            .instance()
            .set(&DataKey::P1VehicleType, &p1_vehicle_type);
        env.storage()
            .instance()
            .set(&DataKey::P2VehicleType, &p2_vehicle_type);

        // Store verifier contract addresses
        env.storage()
            .instance()
            .set(&DataKey::MovementVerifier, &movement_verifier);
        env.storage()
            .instance()
            .set(&DataKey::AttackVerifier, &attack_verifier);
        env.storage()
            .instance()
            .set(&DataKey::ScanVerifier, &scan_verifier);

        // Initialize cooldowns
        env.storage().instance().set(&DataKey::P1Cooldown, &0u32);
        env.storage().instance().set(&DataKey::P2Cooldown, &0u32);

        // Set game active
        env.storage().instance().set(&DataKey::GameActive, &true);

        // Initialize turn counter (for replay prevention)
        env.storage().instance().set(&DataKey::TurnCounter, &0u64);

        // Clear any existing commitments
        env.storage().instance().remove(&DataKey::P1Hash);
        env.storage().instance().remove(&DataKey::P2Hash);
    }

    /// Commit initial position for a player.
    ///
    /// # Arguments
    /// * `player` - Player address (1 or 2)
    /// * `commitment` - Poseidon hash of position + salt
    ///
    /// # Requirements
    /// * Game must be active
    /// * Only player themselves can commit their position
    /// * Commitment must be 32 bytes
    pub fn commit_position(env: Env, player: Address, commitment: Bytes) {
        Self::require_game_active(&env);

        // Validate commitment size
        if commitment.len() != 32 {
            panic!("Commitment must be 32 bytes");
        }

        // Determine player ID from address
        let player_id = Self::get_player_id(&env, player);

        // Store commitment
        match player_id {
            PLAYER_1 => env.storage().instance().set(&DataKey::P1Hash, &commitment),
            PLAYER_2 => env.storage().instance().set(&DataKey::P2Hash, &commitment),
            _ => panic!("Invalid player"),
        }
    }

    /// Move unit with ZK proof validation.
    ///
    /// # Arguments
    /// * `player` - Player address making the move
    /// * `proof` - UltraHonk proof bytes
    /// * `public_inputs` - Public inputs for the movement circuit
    ///
    /// # Movement Circuit Public Inputs
    /// * [0] old_hash (32 bytes) - Previous position commitment
    /// * [1] new_hash (32 bytes) - New position commitment
    /// * [2] vehicle_type (32 bytes) - Vehicle type
    /// * [3] action_type (32 bytes) - Must be 0 (move)
    /// * [4] turn_counter (32 bytes) - Current turn counter (replay prevention)
    pub fn move_unit(env: Env, player: Address, proof: Bytes, public_inputs: Vec<Bytes>) {
        Self::require_game_active(&env);

        // Get current turn
        let current_turn_counter = Self::get_turn_counter(&env);
        let current_turn = Self::turn_from_counter(current_turn_counter);
        let player_id = Self::get_player_id(&env, player);

        // Must be player's turn
        if player_id != current_turn {
            panic!("Not player's turn");
        }

        // Validate public inputs count
        if public_inputs.len() != 5 {
            panic!("Expected 5 public inputs: old_hash, new_hash, vehicle_type, action_type, turn_counter");
        }

        let old_hash = public_inputs.get(0).unwrap();
        let new_hash = public_inputs.get(1).unwrap();
        let vehicle_type_input = public_inputs.get(2).unwrap();
        let action_type_input = public_inputs.get(3).unwrap();
        let turn_counter_input = public_inputs.get(4).unwrap();

        // Validate input sizes
        if old_hash.len() != 32
            || new_hash.len() != 32
            || vehicle_type_input.len() != 32
            || action_type_input.len() != 32
            || turn_counter_input.len() != 32
        {
            panic!("Public inputs must be 32 bytes each");
        }

        let vehicle_type = Self::bytes_to_u32(&vehicle_type_input);
        let action_type = Self::bytes_to_u32(&action_type_input);
        let proof_turn_counter = Self::bytes_to_u32(&turn_counter_input);

        Self::require_valid_vehicle_type(vehicle_type);

        if action_type != 0 {
            panic!("Invalid action type for move");
        }

        // Prevent replay: turn counter must match
        if proof_turn_counter as u64 != current_turn_counter {
            panic!("Invalid turn counter (possible replay attack)");
        }

        // Verify vehicle type matches stored
        let stored_vehicle_type = Self::get_player_vehicle_type(&env, player_id);
        if stored_vehicle_type != vehicle_type {
            panic!("Vehicle type mismatch");
        }

        // Get current commitment and verify it matches old_hash
        let stored_old_hash = match player_id {
            PLAYER_1 => Self::get_p1_hash(&env),
            PLAYER_2 => Self::get_p2_hash(&env),
            _ => panic!("Invalid player"),
        };

        if stored_old_hash.len() == 0 {
            panic!("No commitment found - player must commit position first");
        }

        // Verify old_hash matches stored commitment
        if old_hash != stored_old_hash {
            panic!("Old hash does not match stored commitment");
        }

        if old_hash == new_hash {
            panic!("New hash must differ from old hash");
        }

        // Get movement verifier from storage
        let movement_verifier = env.storage().instance().get(&DataKey::MovementVerifier).unwrap();

        // Verify proof using movement verifier contract
        let is_valid = Self::verify_proof(&env, movement_verifier, proof, public_inputs);
        if !is_valid {
            panic!("Invalid proof");
        }

        // Decrement cooldowns for the turn
        Self::decrement_cooldowns(&env);

        // Update commitment
        match player_id {
            PLAYER_1 => env.storage().instance().set(&DataKey::P1Hash, &new_hash),
            PLAYER_2 => env.storage().instance().set(&DataKey::P2Hash, &new_hash),
            _ => panic!("Invalid player"),
        }

        // Increment turn counter (prevents replay of old proofs)
        env.storage().instance().set(&DataKey::TurnCounter, &(current_turn_counter + 1));

        // Emit event
        env.events().publish(
            (symbol_short!("move"),),
            MoveEvent {
                player: player_id,
                turn: current_turn_counter,
            },
        );
    }

    /// Attack with ZK proof validation.
    ///
    /// # Arguments
    /// * `attacker` - Attacker's address
    /// * `proof` - UltraHonk proof bytes
    /// * `public_inputs` - Public inputs for the attack circuit
    ///
    /// # Attack Circuit Public Inputs
    /// * [0] attacker_hash (32 bytes) - Attacker's commitment
    /// * [1] defender_hash (32 bytes) - Defender's commitment
    /// * [2] target_x (32 bytes) - Target X coordinate
    /// * [3] target_y (32 bytes) - Target Y coordinate
    /// * [4] vehicle_type (32 bytes) - Vehicle type
    /// * [5] action_type (32 bytes) - Must be 1 (attack)
    /// * [6] turn_counter (32 bytes) - Current turn counter (replay prevention)
    /// * [7] claimed_hit (32 bytes) - Hit result (1 = HIT, 0 = MISS)
    pub fn attack(env: Env, attacker: Address, proof: Bytes, public_inputs: Vec<Bytes>) {
        Self::require_game_active(&env);

        // Get current turn
        let current_turn_counter = Self::get_turn_counter(&env);
        let current_turn = Self::turn_from_counter(current_turn_counter);
        let attacker_id = Self::get_player_id(&env, attacker);

        // Must be attacker's turn
        if attacker_id != current_turn {
            panic!("Not attacker's turn");
        }

        // Validate public inputs count
        if public_inputs.len() != 8 {
            panic!("Expected 8 public inputs: attacker_hash, defender_hash, target_x, target_y, vehicle_type, action_type, turn_counter, claimed_hit");
        }

        let attacker_hash = public_inputs.get(0).unwrap();
        let defender_hash = public_inputs.get(1).unwrap();
        let _target_x = public_inputs.get(2).unwrap();
        let _target_y = public_inputs.get(3).unwrap();
        let vehicle_type_input = public_inputs.get(4).unwrap();
        let action_type_input = public_inputs.get(5).unwrap();
        let turn_counter_input = public_inputs.get(6).unwrap();
        let claimed_hit_input = public_inputs.get(7).unwrap();

        // Validate input sizes
        if attacker_hash.len() != 32
            || defender_hash.len() != 32
            || _target_x.len() != 32
            || _target_y.len() != 32
            || vehicle_type_input.len() != 32
            || action_type_input.len() != 32
            || turn_counter_input.len() != 32
            || claimed_hit_input.len() != 32
        {
            panic!("Public inputs must be 32 bytes each");
        }

        let vehicle_type = Self::bytes_to_u32(&vehicle_type_input);
        let action_type = Self::bytes_to_u32(&action_type_input);
        let proof_turn_counter = Self::bytes_to_u32(&turn_counter_input);
        let claimed_hit = Self::bytes_to_u32(&claimed_hit_input);

        Self::require_valid_vehicle_type(vehicle_type);

        if action_type != 1 {
            panic!("Invalid action type for attack");
        }

        if claimed_hit > 1 {
            panic!("Invalid claimed_hit value");
        }

        // Prevent replay: turn counter must match
        if proof_turn_counter as u64 != current_turn_counter {
            panic!("Invalid turn counter (possible replay attack)");
        }

        // Verify vehicle type matches stored
        let stored_vehicle_type = Self::get_player_vehicle_type(&env, attacker_id);
        if stored_vehicle_type != vehicle_type {
            panic!("Vehicle type mismatch");
        }

        // Enforce tank cooldown on attacks
        if vehicle_type == VEHICLE_TANK {
            let cooldown = Self::get_player_cooldown(&env, attacker_id);
            if cooldown > 0 {
                panic!("Tank is on cooldown");
            }
        }

        // Determine defender
        let defender_id = if attacker_id == PLAYER_1 { PLAYER_2 } else { PLAYER_1 };

        // Verify commitments match stored state
        let stored_attacker_hash = match attacker_id {
            PLAYER_1 => Self::get_p1_hash(&env),
            PLAYER_2 => Self::get_p2_hash(&env),
            _ => panic!("Invalid player"),
        };

        let stored_defender_hash = match defender_id {
            PLAYER_1 => Self::get_p1_hash(&env),
            PLAYER_2 => Self::get_p2_hash(&env),
            _ => panic!("Invalid player"),
        };

        if stored_attacker_hash.len() == 0 || stored_defender_hash.len() == 0 {
            panic!("Both players must commit positions first");
        }

        if attacker_hash != stored_attacker_hash {
            panic!("Attacker hash does not match stored commitment");
        }

        if defender_hash != stored_defender_hash {
            panic!("Defender hash does not match stored commitment");
        }

        // Get attack verifier from storage
        let attack_verifier = env.storage().instance().get(&DataKey::AttackVerifier).unwrap();

        // Verify proof using attack verifier contract
        let is_valid = Self::verify_proof(&env, attack_verifier, proof, public_inputs);
        if !is_valid {
            panic!("Invalid proof");
        }

        // Decrement cooldowns for the turn
        Self::decrement_cooldowns(&env);

        // Apply hit result
        let hit = claimed_hit == 1;
        if hit {
            match defender_id {
                PLAYER_1 => {
                    let current_hp = Self::get_p1_hp(&env);
                    if current_hp > 0 {
                        env.storage().instance().set(&DataKey::P1Hp, &(current_hp - 1));
                    }
                }
                PLAYER_2 => {
                    let current_hp = Self::get_p2_hp(&env);
                    if current_hp > 0 {
                        env.storage().instance().set(&DataKey::P2Hp, &(current_hp - 1));
                    }
                }
                _ => panic!("Invalid player"),
            }

            // Check if game is over
            let defender_hp = if defender_id == PLAYER_1 {
                Self::get_p1_hp(&env)
            } else {
                Self::get_p2_hp(&env)
            };

            if defender_hp == 0 {
                // Game over - attacker wins
                env.storage().instance().set(&DataKey::GameActive, &false);

                // Emit game over event
                env.events().publish(
                    (symbol_short!("game_over"),),
                    GameOverEvent { winner: attacker_id },
                );
            }
        }

        // Apply tank cooldown after attack
        if vehicle_type == VEHICLE_TANK {
            Self::set_player_cooldown(&env, attacker_id, 1);
        }

        // Increment turn counter (prevents replay of old proofs)
        env.storage().instance().set(&DataKey::TurnCounter, &(current_turn_counter + 1));

        // Emit attack event
        env.events().publish(
            (symbol_short!("attack"),),
            AttackEvent {
                attacker: attacker_id,
                hit,
                turn: current_turn_counter,
            },
        );
    }

    /// Scan 2x2 area with ZK proof validation.
    ///
    /// # Arguments
    /// * `scanner` - Scanner's address (must be Cycle)
    /// * `proof` - UltraHonk proof bytes
    /// * `public_inputs` - Public inputs for the scan circuit
    ///
    /// # Scan Circuit Public Inputs
    /// * [0] scanner_hash (32 bytes) - Scanner's commitment
    /// * [1] defender_hash (32 bytes) - Defender's commitment
    /// * [2] scan_x (32 bytes) - Top-left X coordinate of 2x2 area
    /// * [3] scan_y (32 bytes) - Top-left Y coordinate of 2x2 area
    /// * [4] vehicle_type (32 bytes) - Vehicle type (must be 0 for Cycle)
    /// * [5] action_type (32 bytes) - Must be 2 (scan)
    /// * [6] turn_counter (32 bytes) - Current turn counter (replay prevention)
    /// * [7] claimed_scan_hit (32 bytes) - Scan result (1 = enemy detected, 0 = not detected)
    ///
    /// # Notes
    /// * Scan is info-only, does not modify game state
    /// * Only Cycle can scan
    /// * Proof verifies if defender is in the 2x2 scan area
    /// * Coordinates are never stored on-chain
    pub fn scan(env: Env, scanner: Address, proof: Bytes, public_inputs: Vec<Bytes>) {
        Self::require_game_active(&env);

        // Get current turn
        let current_turn_counter = Self::get_turn_counter(&env);
        let current_turn = Self::turn_from_counter(current_turn_counter);
        let scanner_id = Self::get_player_id(&env, scanner);

        // Must be scanner's turn
        if scanner_id != current_turn {
            panic!("Not scanner's turn");
        }

        // Validate public inputs count
        if public_inputs.len() != 8 {
            panic!("Expected 8 public inputs: scanner_hash, defender_hash, scan_x, scan_y, vehicle_type, action_type, turn_counter, claimed_scan_hit");
        }

        let scanner_hash = public_inputs.get(0).unwrap();
        let defender_hash = public_inputs.get(1).unwrap();
        let _scan_x = public_inputs.get(2).unwrap();
        let _scan_y = public_inputs.get(3).unwrap();
        let vehicle_type_input = public_inputs.get(4).unwrap();
        let action_type_input = public_inputs.get(5).unwrap();
        let turn_counter_input = public_inputs.get(6).unwrap();
        let _claimed_scan_hit_input = public_inputs.get(7).unwrap();

        // Validate input sizes
        if scanner_hash.len() != 32
            || defender_hash.len() != 32
            || _scan_x.len() != 32
            || _scan_y.len() != 32
            || vehicle_type_input.len() != 32
            || action_type_input.len() != 32
            || turn_counter_input.len() != 32
            || _claimed_scan_hit_input.len() != 32
        {
            panic!("Public inputs must be 32 bytes each");
        }

        let vehicle_type = Self::bytes_to_u32(&vehicle_type_input);
        let action_type = Self::bytes_to_u32(&action_type_input);
        let proof_turn_counter = Self::bytes_to_u32(&turn_counter_input);

        // Enforce that only Cycle can scan
        if vehicle_type != VEHICLE_CYCLE {
            panic!("Scan is only allowed for Cycle (vehicle_type must be 0)");
        }

        if action_type != 2 {
            panic!("Invalid action type for scan (must be 2)");
        }

        // Prevent replay: turn counter must match
        if proof_turn_counter as u64 != current_turn_counter {
            panic!("Invalid turn counter (possible replay attack)");
        }

        // Verify vehicle type matches stored
        let stored_vehicle_type = Self::get_player_vehicle_type(&env, scanner_id);
        if stored_vehicle_type != vehicle_type {
            panic!("Vehicle type mismatch");
        }

        // Determine defender
        let defender_id = if scanner_id == PLAYER_1 { PLAYER_2 } else { PLAYER_1 };

        // Verify commitments match stored state
        let stored_scanner_hash = match scanner_id {
            PLAYER_1 => Self::get_p1_hash(&env),
            PLAYER_2 => Self::get_p2_hash(&env),
            _ => panic!("Invalid player"),
        };

        let stored_defender_hash = match defender_id {
            PLAYER_1 => Self::get_p1_hash(&env),
            PLAYER_2 => Self::get_p2_hash(&env),
            _ => panic!("Invalid player"),
        };

        if stored_scanner_hash.len() == 0 || stored_defender_hash.len() == 0 {
            panic!("Both players must commit positions first");
        }

        if scanner_hash != stored_scanner_hash {
            panic!("Scanner hash does not match stored commitment");
        }

        if defender_hash != stored_defender_hash {
            panic!("Defender hash does not match stored commitment");
        }

        // Get scan verifier from storage
        let scan_verifier = env.storage().instance().get(&DataKey::ScanVerifier).unwrap();

        // Verify proof using scan verifier contract
        let is_valid = Self::verify_proof(&env, scan_verifier, proof, public_inputs);
        if !is_valid {
            panic!("Invalid proof");
        }

        // Decrement cooldowns for the turn
        Self::decrement_cooldowns(&env);

        // Increment turn counter (prevents replay of old proofs)
        env.storage().instance().set(&DataKey::TurnCounter, &(current_turn_counter + 1));

        // Emit scan event
        env.events().publish(
            (symbol_short!("scan"),),
            ScanEvent {
                scanner: scanner_id,
                turn: current_turn_counter,
            },
        );
    }

    /// Get player 1's commitment hash.
    pub fn get_p1_hash(env: Env) -> Bytes {
        env.storage()
            .instance()
            .get(&DataKey::P1Hash)
            .unwrap_or_else(|| Bytes::new(&env))
    }

    /// Get player 2's commitment hash.
    pub fn get_p2_hash(env: Env) -> Bytes {
        env.storage()
            .instance()
            .get(&DataKey::P2Hash)
            .unwrap_or_else(|| Bytes::new(&env))
    }

    /// Get player 1's HP.
    pub fn get_p1_hp(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::P1Hp)
            .unwrap_or(INITIAL_HP)
    }

    /// Get player 2's HP.
    pub fn get_p2_hp(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::P2Hp)
            .unwrap_or(INITIAL_HP)
    }

    /// Get player 1's vehicle type.
    pub fn get_p1_vehicle_type(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::P1VehicleType)
            .unwrap_or(VEHICLE_CYCLE)
    }

    /// Get player 2's vehicle type.
    pub fn get_p2_vehicle_type(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::P2VehicleType)
            .unwrap_or(VEHICLE_CYCLE)
    }

    /// Get player 1's cooldown.
    pub fn get_p1_cooldown(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::P1Cooldown)
            .unwrap_or(0)
    }

    /// Get player 2's cooldown.
    pub fn get_p2_cooldown(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::P2Cooldown)
            .unwrap_or(0)
    }

    /// Check if game is active.
    pub fn get_game_active(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::GameActive)
            .unwrap_or(false)
    }

    /// Get turn counter (for replay attack prevention).
    pub fn get_turn_counter(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TurnCounter)
            .unwrap_or(0)
    }

    /// Get player 1 address.
    pub fn get_p1_address(env: Env) -> Address {
        env.storage().instance().get(&DataKey::P1Address).unwrap()
    }

    /// Get player 2 address.
    pub fn get_p2_address(env: Env) -> Address {
        env.storage().instance().get(&DataKey::P2Address).unwrap()
    }

    // ============ Helper Functions ============

    /// Require game to be active, panic if not.
    fn require_game_active(env: &Env) {
        if !Self::get_game_active(env.clone()) {
            panic!("Game is not active");
        }
    }

    /// Require vehicle type to be valid.
    fn require_valid_vehicle_type(vehicle_type: u32) {
        if vehicle_type > VEHICLE_TANK {
            panic!("Invalid vehicle type");
        }
    }

    /// Get player ID from address by comparing with stored addresses.
    ///
    /// Returns PLAYER_1 or PLAYER_2 if the address matches a registered player.
    /// Panics if the address is not a player in the game.
    fn get_player_id(env: &Env, player: Address) -> u32 {
        let p1_address: Address = env.storage().instance().get(&DataKey::P1Address).unwrap();

        let p2_address: Address = env.storage().instance().get(&DataKey::P2Address).unwrap();

        if player == p1_address {
            PLAYER_1
        } else if player == p2_address {
            PLAYER_2
        } else {
            panic!("Address is not a player in this game");
        }
    }

    fn get_player_vehicle_type(env: &Env, player_id: u32) -> u32 {
        match player_id {
            PLAYER_1 => Self::get_p1_vehicle_type(env.clone()),
            PLAYER_2 => Self::get_p2_vehicle_type(env.clone()),
            _ => panic!("Invalid player"),
        }
    }

    fn get_player_cooldown(env: &Env, player_id: u32) -> u32 {
        match player_id {
            PLAYER_1 => Self::get_p1_cooldown(env.clone()),
            PLAYER_2 => Self::get_p2_cooldown(env.clone()),
            _ => panic!("Invalid player"),
        }
    }

    fn set_player_cooldown(env: &Env, player_id: u32, cooldown: u32) {
        match player_id {
            PLAYER_1 => env.storage().instance().set(&DataKey::P1Cooldown, &cooldown),
            PLAYER_2 => env.storage().instance().set(&DataKey::P2Cooldown, &cooldown),
            _ => panic!("Invalid player"),
        }
    }

    fn decrement_cooldowns(env: &Env) {
        let p1_cooldown = Self::get_p1_cooldown(env.clone());
        let p2_cooldown = Self::get_p2_cooldown(env.clone());

        if p1_cooldown > 0 {
            env.storage()
                .instance()
                .set(&DataKey::P1Cooldown, &(p1_cooldown - 1));
        }

        if p2_cooldown > 0 {
            env.storage()
                .instance()
                .set(&DataKey::P2Cooldown, &(p2_cooldown - 1));
        }
    }

    fn turn_from_counter(turn_counter: u64) -> u32 {
        if turn_counter % 2 == 0 {
            PLAYER_1
        } else {
            PLAYER_2
        }
    }

    fn verify_proof(env: &Env, verifier: Address, proof: Bytes, public_inputs: Vec<Bytes>) -> bool {
        let args = vec![env, proof.into_val(env), public_inputs.into_val(env)];
        env.invoke_contract::<bool>(&verifier, &Symbol::new(env, "verify_ultrahonk"), args)
    }

    /// Convert Bytes to u32 (little-endian).
    fn bytes_to_u32(bytes: &Bytes) -> u32 {
        let mut result: u32 = 0;
        for i in 0..4 {
            if let Some(byte) = bytes.get(i) {
                result |= (byte as u32) << (i * 8);
            }
        }
        result
    }
}

// ============ Tests ============

#[cfg(test)]
mod test {
    use super::*;

    fn create_test_address(env: &Env, byte: u8) -> Address {
        let mut bytes = [0u8; 32];
        bytes[0] = byte;
        Address::from_array(env, bytes)
    }

    fn create_test_commitment(env: &Env, byte: u8) -> Bytes {
        let mut bytes = [0u8; 32];
        bytes[0] = byte;
        Bytes::from_array(env, &bytes)
    }

    #[test]
    fn test_bytes_to_u32() {
        let env = Env::default();

        // Test value 123456789 (0x075BCD15 in hex)
        let bytes: Bytes = [0x15, 0xCD, 0x5B, 0x07]
            .iter()
            .cloned()
            .collect::<std::vec::Vec<u8>>()
            .into_val(&env);
        let result = VanguardHubContract::bytes_to_u32(&bytes);
        assert_eq!(result, 123456789);
    }

    #[test]
    fn test_bytes_to_u32_zero() {
        let env = Env::default();
        let bytes: Bytes = [0, 0, 0, 0]
            .iter()
            .cloned()
            .collect::<std::vec::Vec<u8>>()
            .into_val(&env);
        let result = VanguardHubContract::bytes_to_u32(&bytes);
        assert_eq!(result, 0);
    }

    #[test]
    fn test_initialize_game() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);
        let p2 = create_test_address(&env, 2);

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone(), 0, 2);

        // Verify initial state
        assert_eq!(VanguardHubContract::get_p1_address(env.clone()), p1);
        assert_eq!(VanguardHubContract::get_p2_address(env.clone()), p2);
        assert_eq!(VanguardHubContract::get_p1_hp(env.clone()), 3);
        assert_eq!(VanguardHubContract::get_p2_hp(env.clone()), 3);
        assert_eq!(VanguardHubContract::get_p1_vehicle_type(env.clone()), 0);
        assert_eq!(VanguardHubContract::get_p2_vehicle_type(env.clone()), 2);
        assert_eq!(VanguardHubContract::get_p1_cooldown(env.clone()), 0);
        assert_eq!(VanguardHubContract::get_p2_cooldown(env.clone()), 0);
        assert_eq!(VanguardHubContract::get_game_active(env.clone()), true);
        assert_eq!(VanguardHubContract::get_turn_counter(env.clone()), 0);
    }

    #[test]
    fn test_initialize_game_twice_panics() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);
        let p2 = create_test_address(&env, 2);

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone(), 1, 1);

        // Second initialization should panic
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone(), 1, 1);
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_initialize_same_player_panics() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            VanguardHubContract::initialize_game(env.clone(), p1.clone(), p1.clone(), 1, 2);
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_commit_position() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);
        let p2 = create_test_address(&env, 2);
        let commitment = create_test_commitment(&env, 10);

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone(), 0, 1);

        // Player 1 commits
        VanguardHubContract::commit_position(env.clone(), p1.clone(), commitment.clone());

        // Verify commitment
        assert_eq!(VanguardHubContract::get_p1_hash(env.clone()), commitment);
        assert_eq!(VanguardHubContract::get_p2_hash(env.clone()).len(), 0);
    }

    #[test]
    fn test_commit_position_invalid_size_panics() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);
        let p2 = create_test_address(&env, 2);
        let invalid_commitment: Bytes = [1u8; 16].into_val(&env);

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone(), 2, 0);

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            VanguardHubContract::commit_position(env.clone(), p1.clone(), invalid_commitment);
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_get_player_id() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);
        let p2 = create_test_address(&env, 2);
        let stranger = create_test_address(&env, 3);

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone(), 0, 2);

        // Should correctly identify players
        assert_eq!(VanguardHubContract::get_player_id(&env, p1), 1);
        assert_eq!(VanguardHubContract::get_player_id(&env, p2), 2);

        // Should panic for non-player
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            VanguardHubContract::get_player_id(&env, stranger);
        }));
        assert!(result.is_err());
    }
}
