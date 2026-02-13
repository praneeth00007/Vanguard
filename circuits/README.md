# Vanguard's Blindside ZK Circuits

This directory contains the Noir v1.x circuits for the Vanguard's Blindside game.

## Circuits

### 1. Movement Circuit (`movement/`)

Proves that a player has moved their unit from one valid position to another within the movement rules.

**Private Inputs:**
- `old_x`: Previous X coordinate
- `old_y`: Previous Y coordinate  
- `new_x`: New X coordinate
- `new_y`: New Y coordinate
- `salt`: 32-byte secret salt for commitment

**Public Inputs:**
- `old_hash`: Commitment to old position (Poseidon hash)
- `new_hash`: Commitment to new position (Poseidon hash)

**Constraints:**
1. `old_hash == Poseidon(old_x, old_y, salt)` - Verify old position
2. `new_hash == Poseidon(new_x, new_y, salt)` - Verify new position  
3. Manhattan distance `|new_x - old_x| + |new_y - old_y| ≤ 2`
4. All coordinates within grid bounds (0-9)

### 2. Attack Circuit (`attack/`)

Proves whether an attack hits or misses the defender's unit without revealing the defender's position (unless it's a hit).

**Private Inputs:**
- `x`: Defender's actual X coordinate
- `y`: Defender's actual Y coordinate
- `salt`: 32-byte secret salt for commitment

**Public Inputs:**
- `commitment`: Defender's position commitment (Poseidon hash)
- `target_x`: Attacker's target X coordinate
- `target_y`: Attacker's target Y coordinate

**Public Output:**
- `bool`: Returns `true` for HIT, `false` for MISS

**Constraints:**
1. `commitment == Poseidon(x, y, salt)` - Verify defender's position
2. Check if `x == target_x && y == target_y`
3. All coordinates within grid bounds (0-9)

## Setup

### Prerequisites

Install Noir v1.x (>= 0.36.0):

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

### Building Circuits

Compile both circuits:

```bash
# Build movement circuit
cd circuits/movement
nargo compile

# Build attack circuit  
cd ../attack
nargo compile
```

This generates the circuit artifacts needed for proof generation and verification.

### Testing Circuits

Run the circuits with example inputs:

```bash
# Test movement circuit
cd circuits/movement
nargo execute

# Test attack circuit
cd ../attack
nargo execute
```

### Generating Proofs

Generate UltraHonk proofs:

```bash
# Generate movement proof
cd circuits/movement
nargo prove

# Generate attack proof
cd ../attack  
nargo prove
```

Proofs will be generated in `target/` directory.

## Integration Notes

### Backend Selection

These circuits are configured to use UltraHonk backend (default in Noir v1.x). No additional configuration needed in `Nargo.toml`.

### Poseidon Hash

Uses Noir's standard library Poseidon implementation optimized for BN254 curve:
- `poseidon::bn254::hash_3([field1, field2, field3])`

This matches Stellar's native Poseidon host function for efficient on-chain verification.

### Proof Generation (Frontend)

Use `@noir-lang/noir_js` in a Web Worker:

```typescript
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@noir-lang/backend_barretenberg';

// Load circuit
const circuit = await fetch('movement.json').then(r => r.json());
const backend = new UltraHonkBackend(circuit);
const noir = new Noir(circuit);

// Generate witness
const witness = await noir.generateWitness(inputs);

// Generate proof
const proof = await backend.generateProof(witness);
```

### Verification (Soroban)

The Soroban verifier contract will:
1. Accept the proof bytes and public inputs
2. Use the official Noir UltraHonk verifier crate
3. Verify the proof on-chain
4. Return success/failure to the hub contract

## Circuit Outputs

### Movement Circuit
- No return value (assertions only)
- Success = proof verifies, move is valid
- Failure = proof verification fails

### Attack Circuit  
- Returns `bool` (public output)
- `true` = HIT (coordinates match)
- `false` = MISS (coordinates don't match)

## Security Notes

1. **Salt Management**: The 32-byte salt must be:
   - Generated securely (crypto-random)
   - Kept private by the player
   - Never revealed on-chain
   - Used consistently for the same unit

2. **Replay Protection**: The hub contract must track:
   - Used commitments
   - Turn numbers
   - Prevent reuse of old proofs

3. **Coordinate Privacy**: 
   - Only commitments are public
   - Actual coordinates never revealed (except on elimination)
   - Proofs are zero-knowledge

4. **Grid Bounds**: All coordinates strictly enforced to [0, 9] range

## File Structure

```
circuits/
├── README.md
├── movement/
│   ├── Nargo.toml         # Circuit configuration
│   ├── Prover.toml        # Example inputs
│   └── src/
│       └── main.nr        # Movement circuit logic
└── attack/
    ├── Nargo.toml         # Circuit configuration  
    ├── Prover.toml        # Example inputs
    └── src/
        └── main.nr        # Attack circuit logic
```

## Next Steps

1. ✅ Circuits implemented
2. ⏳ Build and test circuits with nargo
3. ⏳ Generate circuit artifacts (.json)
4. ⏳ Implement Web Worker proof generation
5. ⏳ Create Soroban verifier contract
6. ⏳ Create Soroban hub contract
7. ⏳ Integrate with frontend

## Resources

- [Noir Documentation](https://noir-lang.org/docs)
- [Noir Standard Library](https://noir-lang.org/docs/noir/standard_library/overview)
- [UltraHonk Backend](https://noir-lang.org/docs/noir/concepts/proving_backend)
- [Stellar Game Studio Reference](https://github.com/Junman140/Stellar-Game-Studio)
