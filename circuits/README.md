# Vanguard's Blindside - ZK Circuits

Zero-knowledge circuits for a 1v1 invisible strategy game on a 10x10 grid using Noir v1.x and Poseidon hashing.

## Overview

Players cannot see opponent units. Only cryptographic commitments are stored on-chain. All gameplay actions are proven using zero-knowledge proofs with UltraHonk backend.

## Circuits

### 1. Movement Circuit (`movement/`)

Proves that a unit moved from one position to another without revealing coordinates.

**Private Inputs:**
- `old_x`: Previous X coordinate (0-9)
- `old_y`: Previous Y coordinate (0-9)
- `new_x`: New X coordinate (0-9)
- `new_y`: New Y coordinate (0-9)
- `salt`: 32-byte secret salt (Field element)

**Public Inputs:**
- `old_hash`: Commitment to old position = Poseidon(old_x, old_y, salt)
- `new_hash`: Commitment to new position = Poseidon(new_x, new_y, salt)

**Constraints:**
1. `old_hash == Poseidon(old_x, old_y, salt)` - Verify old position commitment
2. `new_hash == Poseidon(new_x, new_y, salt)` - Verify new position commitment
3. All coordinates within bounds: 0 ≤ x, y ≤ 9
4. Manhattan distance ≤ 2: `|new_x - old_x| + |new_y - old_y| ≤ 2`

**Purpose:** Allows players to move units while keeping positions hidden from opponent.

---

### 2. Attack Circuit (`attack/`)

Proves whether an attack hits or misses without revealing defender's position.

**Private Inputs:**
- `x`: Defender's actual X coordinate (0-9)
- `y`: Defender's actual Y coordinate (0-9)
- `salt`: 32-byte secret salt (Field element)

**Public Inputs:**
- `commitment`: Defender's position commitment = Poseidon(x, y, salt)
- `target_x`: Attacker's target X coordinate (0-9)
- `target_y`: Attacker's target Y coordinate (0-9)
- `hit`: Boolean result (true = HIT, false = MISS)

**Constraints:**
1. `commitment == Poseidon(x, y, salt)` - Verify defender's position commitment
2. All coordinates within bounds: 0 ≤ x, y, target_x, target_y ≤ 9
3. `hit == (x == target_x && y == target_y)` - Verify hit/miss accuracy

**Purpose:** Defender proves whether attacker hit them without revealing their actual position (unless hit).

---

## Building and Testing

### Prerequisites

Install Noir v1.x (0.38.0 or later):
```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

### Build Circuits

```bash
# Build movement circuit
cd circuits/movement
nargo build

# Build attack circuit
cd circuits/attack
nargo build
```

### Generate Proofs

```bash
# Generate movement proof
cd circuits/movement
nargo prove

# Generate attack proof
cd circuits/attack
nargo prove
```

### Verify Proofs Locally

```bash
# Verify movement proof
cd circuits/movement
nargo verify

# Verify attack proof
cd circuits/attack
nargo verify
```

---

## Integration Notes

### Backend Selection

Both circuits are configured to use **UltraHonk** (default in Noir v1.x). No special configuration needed.

### Poseidon Hash

Circuits use `std::hash::poseidon2::Poseidon2::hash()` from Noir stdlib. This should match Stellar's native `poseidon_hash` host function for consistency.

**Hash Format:**
```noir
let hash = poseidon2::Poseidon2::hash([x, y, salt], 3);
```

The smart contract should compute commitments identically:
```rust
// In Soroban contract
let hash = env.crypto().poseidon_hash(&[x, y, salt]);
```

### Proof Generation (Frontend)

Use `noir_js` and Web Workers for client-side proof generation:

```typescript
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@noir-lang/backend_barretenberg';

// In Web Worker
const backend = new UltraHonkBackend(circuitBytecode);
const noir = new Noir(circuit, backend);

const proof = await noir.generateProof({
  old_x: '3',
  old_y: '5',
  new_x: '4',
  new_y: '6',
  salt: '0x...',
  old_hash: oldCommitment,
  new_hash: newCommitment
});
```

### Verification (Soroban Contract)

The Soroban verifier contract wraps the official Noir UltraHonk verifier:

```rust
// vanguard_verifier contract calls
let valid = verifier.verify(proof, public_inputs);
```

The hub contract calls the verifier and updates state if proof is valid.

---

## Security Considerations

1. **Salt Management:** Salt must be randomly generated (32 bytes) and stored securely client-side. Never transmit or store salt on-chain.

2. **Replay Protection:** Hub contract must track used commitments and prevent reuse of old proofs.

3. **Turn Enforcement:** Hub contract must enforce strict turn-based ordering (Player 1 → Player 2 → Player 1...).

4. **Coordinate Privacy:** Coordinates are never revealed until unit is eliminated (HP = 0).

5. **Bounds Checking:** Circuits enforce 0-9 bounds; hub contract should also validate.

6. **Movement Validation:** Manhattan distance constraint prevents teleportation.

7. **Attack Honesty:** Defender must honestly report hit/miss; lying is detected by proof verification.

---

## Game Flow Example

### Deployment Phase
```
Player 1:
  - Generate salt_1
  - Choose position (3, 5)
  - Compute commitment_1 = Poseidon(3, 5, salt_1)
  - Submit commitment_1 to hub contract

Player 2:
  - Generate salt_2
  - Choose position (7, 2)
  - Compute commitment_2 = Poseidon(7, 2, salt_2)
  - Submit commitment_2 to hub contract
```

### Movement Phase
```
Player 1 moves from (3, 5) to (4, 6):
  - Generate proof:
      old_x = 3, old_y = 5
      new_x = 4, new_y = 6
      salt = salt_1
      old_hash = commitment_1
      new_hash = Poseidon(4, 6, salt_1)
  - Submit proof + new_hash to hub
  - Hub verifies proof via verifier contract
  - Hub updates p1_hash = new_hash
```

### Attack Phase
```
Player 2 attacks (4, 6):
  - Player 2 submits target: (4, 6)
  - Player 1 (defender) generates proof:
      x = 4, y = 6, salt = salt_1
      commitment = current p1_hash
      target_x = 4, target_y = 6
      hit = true
  - Submit proof + hit=true
  - Hub verifies proof
  - Hub decrements p1_hp
  - If p1_hp == 0: Player 2 wins
```

---

## Circuit Files

```
circuits/
├── README.md                    # This file
├── movement/
│   ├── Nargo.toml              # Package config (UltraHonk default)
│   ├── Prover.toml             # Example test inputs
│   └── src/
│       └── main.nr             # Movement circuit
└── attack/
    ├── Nargo.toml              # Package config (UltraHonk default)
    ├── Prover.toml             # Example test inputs
    └── src/
        └── main.nr             # Attack circuit
```

---

## Technical Specifications

- **Noir Version:** >=0.38.0 (v1.x)
- **Backend:** UltraHonk (default)
- **Hash Function:** Poseidon2 (3 inputs)
- **Grid Size:** 10x10 (coordinates 0-9)
- **Movement Range:** Manhattan distance ≤ 2
- **Salt Size:** 32 bytes (Field element)
- **Proof System:** SNARK (UltraHonk backend)

---

## Next Steps

1. ✅ Circuits written (movement + attack)
2. ⏳ Build Soroban verifier contract (wraps Noir UltraHonk verifier)
3. ⏳ Build Soroban hub contract (game logic + state)
4. ⏳ Create TypeScript bindings
5. ⏳ Implement Web Worker proof generation
6. ⏳ Build Next.js frontend
7. ⏳ End-to-end testing

---

## References

- [Noir Documentation](https://noir-lang.org/docs)
- [Noir Soroban Verifier Template](https://github.com/noir-lang/noir-stellar)
- [Stellar Game Studio](https://github.com/Junman140/Stellar-Game-Studio)
- [Soroban Protocol 25 Docs](https://soroban.stellar.org/)
