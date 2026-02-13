# Verifier Integration Example

This file shows the exact code changes needed to integrate with vanguard_verifier contract.

## Option 1: Add Verifier Address Storage (Recommended)

### Step 1: Add Storage Key

```rust
// In DataKey enum
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    P1Address,
    P2Address,
    P1Hash,
    P2Hash,
    P1Hp,
    P2Hp,
    Turn,
    GameActive,
    TurnCounter,
    VerifierAddress,  // <-- ADD THIS
}
```

### Step 2: Add Set Verifier Function

```rust
/// Set the verifier contract address.
///
/// # Arguments
/// * `admin` - Admin address (should be contract deployer)
/// * `verifier_address` - Address of vanguard_verifier contract
///
/// # Requirements
/// * Only admin can call this
/// * Game must not be initialized yet
pub fn set_verifier(env: Env, admin: Address, verifier_address: Address) {
    // Check if game is not initialized
    if Self::get_game_active(&env) {
        panic!("Cannot change verifier after game starts");
    }

    // In production, verify admin is the contract deployer
    // For now, we'll allow any address to set it once
    let existing_verifier = env.storage().instance().get(&DataKey::VerifierAddress);

    if existing_verifier.is_some() {
        panic!("Verifier already set");
    }

    // Store verifier address
    env.storage().instance().set(&DataKey::VerifierAddress, &verifier_address);
}

/// Get the verifier contract address.
pub fn get_verifier_address(env: Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::VerifierAddress)
        .unwrap()
}
```

### Step 3: Update move_unit() to Call Verifier

```rust
/// Move unit with ZK proof validation.
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

    // ============ VERIFIER INTEGRATION START ============
    // Get verifier address
    let verifier_address = Self::get_verifier_address(env.clone());

    // Create verify function symbol
    let verify_fn = soroban_sdk::Symbol::new(&env, "verify_ultrahonk");

    // Create arguments: proof, public_inputs
    let mut args = Vec::new(&env);
    args.push_back(proof.to_val());
    args.push_back(public_inputs.to_val());

    // Call verifier contract
    let verify_result: bool = env
        .invoke_contract(&verifier_address, &verify_fn, args)
        .unwrap();

    // Verify the result
    if !verify_result {
        panic!("Invalid movement proof");
    }
    // ============ VERIFIER INTEGRATION END ============

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
```

### Step 4: Update attack() to Call Verifier

```rust
/// Attack with ZK proof validation.
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

    // ============ VERIFIER INTEGRATION START ============
    // Get verifier address
    let verifier_address = Self::get_verifier_address(env.clone());

    // Create verify function symbol
    let verify_fn = soroban_sdk::Symbol::new(&env, "verify_ultrahonk");

    // Create arguments: proof, public_inputs
    let mut args = Vec::new(&env);
    args.push_back(proof.to_val());
    args.push_back(public_inputs.to_val());

    // Call verifier contract
    let verify_result: bool = env
        .invoke_contract(&verifier_address, &verify_fn, args)
        .unwrap();

    // Verify the result
    if !verify_result {
        panic!("Invalid attack proof");
    }
    // ============ VERIFIER INTEGRATION END ============

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
```

### Step 5: Deployment Script

```bash
#!/bin/bash

# Deploy Verifier Contract
echo "Deploying verifier contract..."
cd ../vanguard_verifier
VERIFIER_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vanguard_verifier.optimized.wasm \
  --network standalone)

echo "Verifier deployed: $VERIFIER_ID"

# Deploy Hub Contract
echo "Deploying hub contract..."
cd ../vanguard_hub
HUB_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vanguard_hub.optimized.wasm \
  --network standalone)

echo "Hub deployed: $HUB_ID"

# Configure Verifier
echo "Configuring verifier in hub..."
soroban contract invoke \
  --id $HUB_ID \
  --network standalone \
  -- \
  set_verifier \
  --admin $ADMIN_ADDRESS \
  --verifier_address $VERIFIER_ID

echo "Setup complete!"
echo "Hub: $HUB_ID"
echo "Verifier: $VERIFIER_ID"
```

---

## Option 2: Hardcode Verifier Address (Simpler)

If you prefer a simpler approach, just hardcode the verifier address:

```rust
// At top of file
const VERIFIER_CONTRACT_ID: &str = "CDXXXX...YOUR_VERIFIER_ID_HERE";

// In functions where you need to call verifier:
let verifier_address = Address::from_contract_id(
    &env,
    ContractId::from_str(&env, VERIFIER_CONTRACT_ID).unwrap()
);
```

This is less flexible but simpler for a single deployment.

---

## Verification of Integration

After adding verifier integration, test with:

```bash
# 1. Deploy both contracts
./deploy-contracts.sh

# 2. Initialize game
soroban contract invoke \
  --id $HUB_ID \
  --network standalone \
  -- \
  initialize_game \
  --p1 $P1_ADDRESS \
  --p2 $P2_ADDRESS

# 3. Set verifier
soroban contract invoke \
  --id $HUB_ID \
  --network standalone \
  -- \
  set_verifier \
  --admin $ADMIN_ADDRESS \
  --verifier_address $VERIFIER_ID

# 4. Generate a movement proof (with noir_js)
# 5. Submit move - should call verifier contract
soroban contract invoke \
  --id $HUB_ID \
  --network standalone \
  -- \
  move_unit \
  --player $P1_ADDRESS \
  --proof $(cat proof.bin) \
  --public_inputs $(cat public_inputs.bin)
```

If the verifier rejects the proof, the transaction will fail with "Invalid movement proof".

---

## Troubleshooting

### Error: "Verifier not set"

You forgot to call `set_verifier()` before the first game action.

### Error: "Invalid proof"

The verifier contract rejected the proof. Check:
1. Proof format (UltraHonk, not Groth16)
2. Public inputs order and format
3. Verification key matches the circuit

### Error: "Cannot change verifier after game starts"

Once `initialize_game()` is called, the verifier address is locked.

---

## Summary

The vanguard_hub contract is ready for verifier integration. You have two options:

1. **Recommended:** Add `set_verifier()` function and dynamic verifier address storage
2. **Simple:** Hardcode the verifier contract ID

Both approaches work. Choose based on your deployment needs.
