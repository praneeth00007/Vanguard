# Vanguard Hub Contract

Game logic hub for Vanguard's Blindside ZK tactical game.

## Overview

This contract manages all game state, enforces turn order, validates proofs via the verifier contract, and handles win conditions. It follows the Stellar Game Studio (SGS) contract pattern.

## Architecture

```
┌─────────────────────────────────┐
│   Frontend (Next.js)            │
│   ┌─────────────────────────┐   │
│   │  Web Worker (noir_js)   │   │
│   │  - Generate proofs      │   │
│   │  - Public inputs        │   │
│   └─────────────────────────┘   │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   vanguard_hub (This Contract)  │
│                                 │
│   Storage:                      │
│   - P1Address, P2Address        │
│   - P1Hash, P2Hash              │
│   - P1Hp, P2Hp (starts at 3)    │
│   - Turn (1 or 2)               │
│   - GameActive (bool)           │
│   - TurnCounter (u64)           │
│                                 │
│   Functions:                    │
│   - initialize_game()           │
│   - commit_position()           │
│   - move_unit()                 │
│   - attack()                    │
│   - Getters for all state       │
└─────────────┬───────────────────┘
              │ verify_ultrahonk()
              ▼
┌─────────────────────────────────┐
│   vanguard_verifier             │
│   - Wraps Noir UltraHonk        │
│   - Returns: bool (valid?)      │
└─────────────────────────────────┘
```

## Storage

### DataKey Enum

| Key               | Type      | Description                              |
|-------------------|-----------|------------------------------------------|
| P1Address         | Address   | Player 1 wallet address                  |
| P2Address         | Address   | Player 2 wallet address                  |
| P1Hash            | Bytes(32) | Player 1 position commitment             |
| P2Hash            | Bytes(32) | Player 2 position commitment             |
| P1Hp              | u32       | Player 1 HP (starts at 3)                |
| P2Hp              | u32       | Player 2 HP (starts at 3)                |
| Turn              | u32       | Current turn (1 or 2)                    |
| GameActive        | bool      | Whether game is active                   |
| TurnCounter       | u64       | Turn counter for replay attack prevention|

## Functions

### initialize_game(p1, p2)

Initialize a new game between two players.

**Parameters:**
- `p1`: Address of player 1
- `p2`: Address of player 2

**Requirements:**
- Game must not already be initialized
- Players must be different

**Effects:**
- Stores player addresses
- Sets HP to 3 for both players
- Sets turn to 1
- Sets game active to true
- Initializes turn counter to 0
- Clears any existing commitments

---

### commit_position(player, commitment)

Commit initial position for a player.

**Parameters:**
- `player`: Player address
- `commitment`: Poseidon hash of (x, y, salt) - 32 bytes

**Requirements:**
- Game must be active
- Only player themselves can commit their position
- Commitment must be 32 bytes

**Effects:**
- Stores the commitment for the player

**Usage:**
```rust
let salt = generate_random_salt();
let commitment = poseidon_hash([x, y, salt]);
hub::commit_position(player_address, commitment);
```

---

### move_unit(player, proof, public_inputs)

Move unit with ZK proof validation.

**Parameters:**
- `player`: Player address making the move
- `proof`: UltraHonk proof bytes
- `public_inputs`: Vec<Bytes> - Public inputs for movement circuit

**Movement Circuit Public Inputs:**
- `[0]` old_hash (32 bytes) - Previous position commitment
- `[1]` new_hash (32 bytes) - New position commitment
- `[2]` turn_counter (32 bytes) - Current turn counter (little-endian)

**Requirements:**
- Game must be active
- Must be player's turn
- Proof must be valid (verified by vanguard_verifier)
- Turn counter in proof must match current turn counter
- Old hash must match stored commitment

**Effects:**
- Updates position commitment
- Increments turn counter
- Switches turn to other player
- Emits MoveEvent

**Game Flow:**
```
1. Player generates movement proof with noir_js
   - Private inputs: old_x, old_y, new_x, new_y, salt
   - Public inputs: old_hash, new_hash, turn_counter

2. Frontend calls move_unit()
   - proof + public_inputs

3. Hub verifies old_hash matches stored commitment

4. Hub calls vanguard_verifier::verify_ultrahonk()

5. If valid:
   - Update commitment
   - Increment turn counter
   - Switch turn
   - Emit event
```

---

### attack(attacker, proof, public_inputs)

Attack with ZK proof validation.

**Parameters:**
- `attacker`: Attacker's address
- `proof`: UltraHonk proof bytes
- `public_inputs`: Vec<Bytes> - Public inputs for attack circuit

**Attack Circuit Public Inputs:**
- `[0]` commitment (32 bytes) - Defender's position commitment
- `[1]` target_x (32 bytes) - Target X coordinate
- `[2]` target_y (32 bytes) - Target Y coordinate
- `[3]` hit (32 bytes) - Hit result (1 = HIT, 0 = MISS)
- `[4]` turn_counter (32 bytes) - Current turn counter (little-endian)

**Requirements:**
- Game must be active
- Must be attacker's turn
- Proof must be valid
- Turn counter must match
- Commitment must match defender's stored commitment

**Effects:**
- If hit: decrement defender's HP
- If HP reaches 0: end game and emit GameOverEvent
- Increment turn counter
- Switch turn to defender
- Emit AttackEvent

**Game Flow:**
```
1. Attacker chooses target (tx, ty)

2. Defender generates attack proof with noir_js
   - Private inputs: x, y, salt
   - Public inputs: commitment, target_x, target_y, hit, turn_counter
   - Where hit = (x == target_x) && (y == target_y)

3. Frontend calls attack()
   - proof + public_inputs

4. Hub verifies commitment matches defender's stored commitment

5. Hub calls vanguard_verifier::verify_ultrahonk()

6. If valid:
   - Parse hit result from public inputs
   - If hit: decrement defender HP
   - If HP == 0: game over
   - Increment turn counter
   - Switch turn
   - Emit event
```

---

## Getters

### State Getters

```rust
// Get player addresses
get_p1_address(env) -> Address
get_p2_address(env) -> Address

// Get commitments (Poseidon hashes)
get_p1_hash(env) -> Bytes(32)
get_p2_hash(env) -> Bytes(32)

// Get HP
get_p1_hp(env) -> u32
get_p2_hp(env) -> u32

// Get game state
get_turn(env) -> u32        // Returns 1 or 2
get_game_active(env) -> bool
get_turn_counter(env) -> u64
```

---

## Events

### MoveEvent

```rust
pub struct MoveEvent {
    pub player: u32,  // Player who moved
    pub turn: u64,    // Turn number
}
```

**Topic:** `(MoveEvent::PLAYER, MoveEvent::TURN)`

---

### AttackEvent

```rust
pub struct AttackEvent {
    pub attacker: u32,  // Attacker ID
    pub hit: bool,      // Whether it was a hit
    pub turn: u64,      // Turn number
}
```

**Topic:** `(AttackEvent::ATTACKER, AttackEvent::HIT, AttackEvent::TURN)`

---

### GameOverEvent

```rust
pub struct GameOverEvent {
    pub winner: u32,  // Winning player ID
}
```

**Topic:** `(GameOverEvent::WINNER,)`

---

## Security Features

### Replay Attack Prevention

The contract uses a `turn_counter` that is incremented on every move and attack. Proofs must include the current turn counter as a public input, preventing old proofs from being reused.

```rust
let current_turn_counter = get_turn_counter(&env);
let proof_turn_counter = bytes_to_u32(&public_inputs[2]);

if proof_turn_counter != current_turn_counter {
    panic!("Invalid turn counter (possible replay attack)");
}
```

### Turn Order Enforcement

The contract strictly enforces turn order:
- Player 1 goes first
- Turns alternate after each move or attack
- Only the player whose turn it is can act

### Commitment Verification

The contract verifies that:
1. Old position commitments match stored values before updating
2. Defender commitments match stored values during attacks
3. This prevents unauthorized commitment changes

### ZK Proof Validation

All game state changes require valid ZK proofs verified by `vanguard_verifier`:
- **Movement proofs:** Ensure Manhattan distance ≤ 2 without revealing coordinates
- **Attack proofs:** Prove hit/miss without revealing position

The hub contract does NOT:
- Reimplement cryptographic verification
- Check Manhattan distance (circuit guarantees it)
- Store coordinates or salts
- Reveal private inputs

---

## Integration with Verifier

The hub contract calls `vanguard_verifier` to validate proofs. This is done via cross-contract invocation:

```rust
// In production, this would be:
let verifier_id = Address::from_contract_id(&env, VERIFIER_CONTRACT_ID);
let verify_result: bool = env.invoke_contract(
    &verifier_id,
    &Symbol::new(&env, "verify_ultrahonk"),
    vec![&env, proof, public_inputs]
).unwrap();

if !verify_result {
    panic!("Invalid proof");
}
```

**Note:** The current implementation assumes proof verification is handled externally. In production, you should:
1. Deploy `vanguard_verifier` contract
2. Store its address in hub contract (or pass as parameter)
3. Call `verify_ultrahonk()` on each move and attack

---

## Building and Testing

### Build Contract

```bash
cd contracts/vanguard_hub
cargo build --release --target wasm32-unknown-unknown
```

### Run Tests

```bash
cargo test
```

### Generate TypeScript Bindings

```bash
# From project root
bun run bindings
```

This will generate type-safe bindings in `bindings/vanguard_hub.ts`.

---

## Usage Example

```typescript
import { Contract } from '@stellar/stellar-sdk';

// Initialize game
const hub = new Contract(hubContractId);
const tx = new TransactionBuilder(sourceAccount)
  .addOperation(hub.call("initialize_game", p1Address, p2Address))
  .build();
tx.sign(p1Keypair);
await server.sendTransaction(tx);

// Commit position
const commitment = await computePoseidonHash(x, y, salt);
const tx = new TransactionBuilder(sourceAccount)
  .addOperation(hub.call("commit_position", playerAddress, commitment))
  .build();
tx.sign(playerKeypair);
await server.sendTransaction(tx);

// Move unit (with ZK proof)
const { proof, publicInputs } = await generateMovementProof({
  oldX: 2, oldY: 3,
  newX: 4, newY: 3,
  salt: salt,
  turnCounter: 0
});

const tx = new TransactionBuilder(sourceAccount)
  .addOperation(hub.call("move_unit", playerAddress, proof, publicInputs))
  .build();
tx.sign(playerKeypair);
await server.sendTransaction(tx);
```

---

## Compliance with SGS Pattern

✅ **Storage:** Uses Soroban instance storage with enum-based keys
✅ **Functions:** Public fn for game actions + getters for state
✅ **Events:** Emits events for all state changes
✅ **Tests:** Comprehensive unit tests included
✅ **Documentation:** Complete function-level docs
✅ **Dependencies:** Uses soroban-sdk 22.0.0
✅ **Build:** Optimized release profile with LTO

---

## License

See project root for license information.
