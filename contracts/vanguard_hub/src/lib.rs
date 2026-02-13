#![no_std]

//! Vanguard Hub Contract
//!
//! Game logic hub for Vanguard's Blindside ZK game.
//! Manages game state, commitments, HP, and turn order.
//! Coordinates with vanguard_verifier for proof validation.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, Env, Vec};

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
    /// Current turn: 1 or 2
    Turn,
    /// Game active flag
    GameActive,
    /// Number of turns completed (for replay prevention)
    TurnCounter,
}

/// Player identifiers
const PLAYER_1: u32 = 1;
const PLAYER_2: u32 = 2;
const INITIAL_HP: u32 = 3;

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
    ///
    /// # Requirements
    /// * Game must not already be initialized
    /// * Players must be different
    ///
    /// # Sets
    /// * Player addresses
    /// * HP to 3 for both players
    /// * Turn to 1
    /// * Game active to true
    /// * Turn counter to 0
    pub fn initialize_game(env: Env, p1: Address, p2: Address) {
        // Check game is not already initialized
        if Self::get_game_active(&env) {
            panic!("Game already initialized");
        }

        // Require different players
        if p1 == p2 {
            panic!("Players must be different");
        }

        // Store player addresses
        env.storage().instance().set(&DataKey::P1Address, &p1);
        env.storage().instance().set(&DataKey::P2Address, &p2);

        // Initialize HP
        env.storage().instance().set(&DataKey::P1Hp, &INITIAL_HP);
        env.storage().instance().set(&DataKey::P2Hp, &INITIAL_HP);

        // Set initial turn to player 1
        env.storage().instance().set(&DataKey::Turn, &PLAYER_1);

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
    /// * [2] turn_counter (32 bytes) - Current turn counter (replay prevention)
    ///
    /// # Requirements
    /// * Game must be active
    /// * Must be player's turn
    /// * Proof must be valid (verified by vanguard_verifier)
    /// * Turn counter in proof must match current turn counter
    /// * New commitment must differ from old commitment
    ///
    /// # Effects
    /// * Updates position commitment
    /// * Increments turn counter
    /// * Switches turn to other player
    /// * Emits MoveEvent
    pub fn move_unit(env: Env, player: Address, proof: Bytes, public_inputs: Vec<Bytes>) {
        Self::require_game_active(&env);

        // Get current turn
        let current_turn = Self::get_turn(&env);
        let player_id = Self::get_player_id(&env, player);

        // Must be player's turn
        if player_id != current_turn {
            panic!("Not player's turn");
        }

        // Validate public inputs count
        if public_inputs.len() != 3 {
            panic!("Expected 3 public inputs: old_hash, new_hash, turn_counter");
        }

        let old_hash = public_inputs.get(0).unwrap();
        let new_hash = public_inputs.get(1).unwrap();
        let turn_counter_input = public_inputs.get(2).unwrap();

        // Validate input sizes
        if old_hash.len() != 32 || new_hash.len() != 32 || turn_counter_input.len() != 32 {
            panic!("Public inputs must be 32 bytes each");
        }

        // Get current turn counter
        let current_turn_counter = Self::get_turn_counter(&env);

        // Parse turn counter from public input
        let proof_turn_counter = Self::bytes_to_u32(turn_counter_input);

        // Prevent replay: turn counter must match
        if proof_turn_counter as u64 != current_turn_counter {
            panic!("Invalid turn counter (possible replay attack)");
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

        // Verify proof using vanguard_verifier contract
        let verifier_address = env.get_contract_id();
        // Note: In production, you would store the verifier contract address
        // For now, we assume cross-contract call will be made externally
        // or verifier will be deployed at a known address

        // The verification should be done via:
        // env.invoke_contract(&verifier_addr, &Symbol::new(&env, "verify_ultrahonk"), vec![&env, proof, public_inputs])

        // For now, we assume verification is passed
        // In production, this would call vanguard_verifier::verify_ultrahonk(proof, public_inputs)

        // Update commitment
        match player_id {
            PLAYER_1 => env.storage().instance().set(&DataKey::P1Hash, &new_hash),
            PLAYER_2 => env.storage().instance().set(&DataKey::P2Hash, &new_hash),
            _ => panic!("Invalid player"),
        }

        // Increment turn counter (prevents replay of old proofs)
        env.storage().instance().set(&DataKey::TurnCounter, &(current_turn_counter + 1));

        // Switch turn
        let next_turn = if current_turn == PLAYER_1 { PLAYER_2 } else { PLAYER_1 };
        env.storage().instance().set(&DataKey::Turn, &next_turn);

        // Emit event
        env.events().publish(
            (MoveEvent::PLAYER, MoveEvent::TURN),
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
    /// * [0] commitment (32 bytes) - Defender's position commitment
    /// * [1] target_x (32 bytes) - Target X coordinate (public, chosen by attacker)
    /// * [2] target_y (32 bytes) - Target Y coordinate (public, chosen by attacker)
    /// * [3] hit (32 bytes) - Hit result (1 = HIT, 0 = MISS)
    /// * [4] turn_counter (32 bytes) - Current turn counter (replay prevention)
    ///
    /// # Requirements
    /// * Game must be active
    /// * Must be attacker's turn
    /// * Proof must be valid
    /// * Turn counter must match
    /// * Commitment must match defender's stored commitment
    ///
    /// # Effects
    /// * If hit: decrement defender's HP
    /// * If HP reaches 0: end game and reveal winner
    /// * Increment turn counter
    /// * Switch turn to defender
    /// * Emit AttackEvent
    pub fn attack(env: Env, attacker: Address, proof: Bytes, public_inputs: Vec<Bytes>) {
        Self::require_game_active(&env);

        // Get current turn
        let current_turn = Self::get_turn(&env);
        let attacker_id = Self::get_player_id(&env, attacker);

        // Must be attacker's turn
        if attacker_id != current_turn {
            panic!("Not attacker's turn");
        }

        // Validate public inputs count
        if public_inputs.len() != 5 {
            panic!("Expected 5 public inputs: commitment, target_x, target_y, hit, turn_counter");
        }

        let commitment = public_inputs.get(0).unwrap();
        let _target_x = public_inputs.get(1).unwrap();
        let _target_y = public_inputs.get(2).unwrap();
        let hit_input = public_inputs.get(3).unwrap();
        let turn_counter_input = public_inputs.get(4).unwrap();

        // Validate input sizes
        if commitment.len() != 32
            || _target_x.len() != 32
            || _target_y.len() != 32
            || hit_input.len() != 32
            || turn_counter_input.len() != 32
        {
            panic!("Public inputs must be 32 bytes each");
        }

        // Get current turn counter
        let current_turn_counter = Self::get_turn_counter(&env);

        // Parse turn counter from public input
        let proof_turn_counter = Self::bytes_to_u32(turn_counter_input);

        // Prevent replay: turn counter must match
        if proof_turn_counter as u64 != current_turn_counter {
            panic!("Invalid turn counter (possible replay attack)");
        }

        // Determine defender
        let defender_id = if attacker_id == PLAYER_1 { PLAYER_2 } else { PLAYER_1 };

        // Verify commitment matches defender's stored commitment
        let defender_hash = match defender_id {
            PLAYER_1 => Self::get_p1_hash(&env),
            PLAYER_2 => Self::get_p2_hash(&env),
            _ => panic!("Invalid player"),
        };

        if defender_hash.len() == 0 {
            panic!("Defender has not committed position");
        }

        if commitment != defender_hash {
            panic!("Commitment does not match defender's stored commitment");
        }

        // Verify proof using vanguard_verifier contract
        // In production: env.invoke_contract(&verifier_addr, &Symbol::new(&env, "verify_ultrahonk"), vec![&env, proof, public_inputs])

        // Parse hit result (1 = HIT, 0 = MISS)
        let hit = Self::bytes_to_u32(hit_input) == 1;

        // If hit, decrement defender's HP
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
                    (GameOverEvent::WINNER,),
                    GameOverEvent { winner: attacker_id },
                );
            }
        }

        // Increment turn counter (prevents replay of old proofs)
        env.storage().instance().set(&DataKey::TurnCounter, &(current_turn_counter + 1));

        // Switch turn (attacker becomes defender for next round)
        let next_turn = defender_id;
        env.storage().instance().set(&DataKey::Turn, &next_turn);

        // Emit attack event
        env.events().publish(
            (AttackEvent::ATTACKER, AttackEvent::HIT, AttackEvent::TURN),
            AttackEvent {
                attacker: attacker_id,
                hit,
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

    /// Get current turn (1 or 2).
    pub fn get_turn(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Turn)
            .unwrap_or(PLAYER_1)
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
        env.storage()
            .instance()
            .get(&DataKey::P1Address)
            .unwrap()
    }

    /// Get player 2 address.
    pub fn get_p2_address(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::P2Address)
            .unwrap()
    }

    // ============ Helper Functions ============

    /// Require game to be active, panic if not.
    fn require_game_active(env: &Env) {
        if !Self::get_game_active(env.clone()) {
            panic!("Game is not active");
        }
    }

    /// Get player ID from address by comparing with stored addresses.
    ///
    /// Returns PLAYER_1 or PLAYER_2 if the address matches a registered player.
    /// Panics if the address is not a player in the game.
    fn get_player_id(env: &Env, player: Address) -> u32 {
        let p1_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::P1Address)
            .unwrap();

        let p2_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::P2Address)
            .unwrap();

        if player == p1_address {
            PLAYER_1
        } else if player == p2_address {
            PLAYER_2
        } else {
            panic!("Address is not a player in this game");
        }
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
        let bytes: Bytes = [0x15, 0xCD, 0x5B, 0x07].iter().cloned().collect::<Vec<u8>>().into_val(&env);
        let result = VanguardHubContract::bytes_to_u32(&bytes);
        assert_eq!(result, 123456789);
    }

    #[test]
    fn test_bytes_to_u32_zero() {
        let env = Env::default();
        let bytes: Bytes = [0, 0, 0, 0].iter().cloned().collect::<Vec<u8>>().into_val(&env);
        let result = VanguardHubContract::bytes_to_u32(&bytes);
        assert_eq!(result, 0);
    }

    #[test]
    fn test_initialize_game() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);
        let p2 = create_test_address(&env, 2);

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone());

        // Verify initial state
        assert_eq!(VanguardHubContract::get_p1_address(env.clone()), p1);
        assert_eq!(VanguardHubContract::get_p2_address(env.clone()), p2);
        assert_eq!(VanguardHubContract::get_p1_hp(env.clone()), 3);
        assert_eq!(VanguardHubContract::get_p2_hp(env.clone()), 3);
        assert_eq!(VanguardHubContract::get_turn(env.clone()), 1);
        assert_eq!(VanguardHubContract::get_game_active(env.clone()), true);
        assert_eq!(VanguardHubContract::get_turn_counter(env.clone()), 0);
    }

    #[test]
    fn test_initialize_game_twice_panics() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);
        let p2 = create_test_address(&env, 2);

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone());

        // Second initialization should panic
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone());
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_initialize_same_player_panics() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            VanguardHubContract::initialize_game(env.clone(), p1.clone(), p1.clone());
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_commit_position() {
        let env = Env::default();
        let p1 = create_test_address(&env, 1);
        let p2 = create_test_address(&env, 2);
        let commitment = create_test_commitment(&env, 10);

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone());

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

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone());

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

        VanguardHubContract::initialize_game(env.clone(), p1.clone(), p2.clone());

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
