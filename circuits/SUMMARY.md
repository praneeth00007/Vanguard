# Vanguard's Blindside - Circuit Implementation Summary

## ✅ Deliverables Complete

### 1. Movement Circuit (`movement/src/main.nr`)
- ✅ Proves valid movement without revealing coordinates
- ✅ Verifies old and new position commitments
- ✅ Enforces Manhattan distance ≤ 2
- ✅ Validates grid bounds (0-9)
- ✅ Uses Poseidon2 hash with 3 inputs

### 2. Attack Circuit (`attack/src/main.nr`)
- ✅ Proves honest hit/miss reporting
- ✅ Verifies defender's position commitment
- ✅ Prevents lying about attack results
- ✅ Validates grid bounds (0-9)
- ✅ Uses Poseidon2 hash with 3 inputs

### 3. Deployment Circuit (`deployment/src/main.nr`)
- ✅ Optional circuit for initial placement
- ✅ Proves valid starting position
- ✅ Verifies commitment matches coordinates
- ✅ Validates grid bounds (0-9)

### 4. Configuration
- ✅ Nargo.toml configured for each circuit
- ✅ Noir compiler version >=0.38.0
- ✅ UltraHonk backend (default, no special config needed)
- ✅ Example Prover.toml test inputs

### 5. Documentation
- ✅ README.md - Complete overview and usage guide
- ✅ INTEGRATION.md - Soroban and frontend integration
- ✅ TESTING_EXAMPLES.md - Concrete test scenarios
- ✅ QUICK_REFERENCE.md - Fast lookup reference
- ✅ test-circuits.sh - Build automation script

---

## Circuit Specifications

### Movement Circuit
**File:** `circuits/movement/src/main.nr`

**Private Inputs:**
- `old_x: Field` - Previous X coordinate
- `old_y: Field` - Previous Y coordinate  
- `new_x: Field` - New X coordinate
- `new_y: Field` - New Y coordinate
- `salt: Field` - Secret 32-byte salt

**Public Inputs:**
- `old_hash: pub Field` - Commitment to old position
- `new_hash: pub Field` - Commitment to new position

**Constraints:**
1. `old_hash == Poseidon(old_x, old_y, salt)`
2. `new_hash == Poseidon(new_x, new_y, salt)`
3. `0 ≤ old_x, old_y, new_x, new_y ≤ 9`
4. `|new_x - old_x| + |new_y - old_y| ≤ 2`

**Lines of Code:** 55

---

### Attack Circuit
**File:** `circuits/attack/src/main.nr`

**Private Inputs:**
- `x: Field` - Defender's actual X coordinate
- `y: Field` - Defender's actual Y coordinate
- `salt: Field` - Secret 32-byte salt

**Public Inputs:**
- `commitment: pub Field` - Defender's position commitment
- `target_x: pub Field` - Attacker's target X
- `target_y: pub Field` - Attacker's target Y
- `hit: pub bool` - Attack result (true=HIT, false=MISS)

**Constraints:**
1. `commitment == Poseidon(x, y, salt)`
2. `0 ≤ x, y, target_x, target_y ≤ 9`
3. `hit == (x == target_x && y == target_y)`

**Lines of Code:** 36

---

## Key Design Decisions

### 1. Poseidon2 Hash Function
- Uses Noir stdlib: `std::hash::poseidon2::Poseidon2::hash()`
- **3 inputs:** `[x, y, salt]`
- Must match Stellar's native `poseidon_hash` host function
- Provides strong cryptographic commitment

### 2. Field Type for Coordinates
- Coordinates stored as `Field` type in circuits
- Allows native ZK operations
- Cast to `u32` for bounds checking
- Compatible with Soroban contract storage

### 3. Manhattan Distance
- Formula: `|x2 - x1| + |y2 - y1|`
- Maximum distance: 2 tiles
- Implemented using conditional absolute value
- Prevents teleportation exploits

### 4. Public Hit/Miss Output
- Attack circuit requires `hit` as public input
- Defender must prove correct hit/miss
- Circuit enforces honesty via constraint
- Prevents defensive lying

### 5. Minimal Circuit Design
- No complex game logic in circuits
- Only cryptographic proofs
- Game rules enforced by hub contract
- Keeps circuits fast and auditable

---

## Security Properties

### ✅ Position Privacy
- Coordinates never revealed until unit eliminated
- Only cryptographic commitments stored on-chain
- Salt remains client-side forever

### ✅ Movement Validity
- Cannot teleport (distance constraint)
- Cannot move out of bounds
- Cannot reuse old commitments (hub enforces)

### ✅ Attack Honesty
- Defender cannot lie about hit/miss
- Proof verification catches dishonesty
- Attacker sees result but not position (unless hit)

### ✅ Replay Protection
- Hub contract must track used proofs
- Same proof cannot be submitted twice
- Prevents time-travel exploits

### ✅ Turn Enforcement
- Hub contract enforces alternating turns
- Player cannot move twice in a row
- Strict ordering: P1 → P2 → P1 → P2...

---

## Integration Points

### 1. Soroban Verifier Contract
```rust
// Wraps official Noir UltraHonk verifier
pub fn verify(
    env: Env,
    proof: Bytes,
    public_inputs: Vec<Bytes>
) -> bool
```

### 2. Soroban Hub Contract
```rust
// Calls verifier + manages game state
pub fn move_unit(
    env: Env,
    player: Address,
    proof: Bytes,
    new_hash: Bytes
) -> Result<(), GameError>

pub fn attack(
    env: Env,
    attacker: Address,
    target_x: u32,
    target_y: u32,
    defender_proof: Bytes,
    hit: bool
) -> Result<AttackResult, GameError>
```

### 3. Frontend Web Worker
```typescript
// Generate proofs client-side
const { proof, publicInputs } = await noir.generateProof({
  old_x: '3',
  old_y: '5',
  new_x: '4',
  new_y: '6',
  salt: salt,
  old_hash: oldCommitment,
  new_hash: newCommitment
});
```

---

## Build and Test Commands

```bash
# Build all circuits
cd circuits/movement && nargo build
cd ../attack && nargo build  
cd ../deployment && nargo build

# Or use automation script
cd circuits
./test-circuits.sh

# Generate proof (local test)
cd movement
nargo prove

# Verify proof (local test)
nargo verify

# Export for frontend
nargo export
```

---

## File Structure

```
circuits/
├── .gitignore                   # Ignore build artifacts
├── README.md                    # Main documentation
├── INTEGRATION.md               # Soroban + frontend guide
├── TESTING_EXAMPLES.md          # Test scenarios
├── QUICK_REFERENCE.md           # Fast lookup
├── SUMMARY.md                   # This file
├── test-circuits.sh             # Build automation
│
├── movement/
│   ├── Nargo.toml              # Package config
│   ├── Prover.toml             # Test inputs
│   └── src/
│       └── main.nr             # Circuit code (55 lines)
│
├── attack/
│   ├── Nargo.toml              # Package config
│   ├── Prover.toml             # Test inputs
│   └── src/
│       └── main.nr             # Circuit code (36 lines)
│
└── deployment/
    ├── Nargo.toml              # Package config
    ├── Prover.toml             # Test inputs
    └── src/
        └── main.nr             # Circuit code (21 lines)
```

**Total Circuit Code:** 112 lines (pure logic, no boilerplate)

---

## Technical Stack

- **Language:** Noir v1.x
- **Compiler:** Nargo >=0.38.0
- **Backend:** UltraHonk (default)
- **Hash:** Poseidon2 (3 inputs)
- **Proof System:** SNARK
- **Target:** Soroban Protocol 25

---

## What's NOT Included (By Design)

❌ **No Soroban contract code** - Separate deliverable
❌ **No frontend code** - Separate deliverable  
❌ **No cryptographic implementation** - Uses Noir stdlib
❌ **No UltraHonk math** - Uses official verifier template
❌ **No game logic** - Enforced by hub contract
❌ **No networking** - Handled by Stellar network
❌ **No key management** - Handled by wallets

This is intentional. Circuits focus purely on ZK proofs.

---

## Next Steps (Recommended Order)

1. ✅ **Circuits complete** ← YOU ARE HERE
2. ⏳ **Build Soroban verifier contract**
   - Wrap official Noir UltraHonk verifier template
   - Deploy to testnet
3. ⏳ **Build Soroban hub contract**
   - Implement game state management
   - Call verifier contract
   - Enforce turn order and rules
4. ⏳ **Generate TypeScript bindings**
   - Use stellar CLI
   - Export contract interfaces
5. ⏳ **Implement Web Worker proof generation**
   - Use noir_js
   - Isolate CPU-intensive work
6. ⏳ **Build Next.js frontend**
   - Game UI
   - Wallet integration
   - Proof coordination
7. ⏳ **End-to-end testing**
   - Deploy both contracts
   - Play complete games
   - Verify all proofs on-chain

---

## Verification Checklist

Before deploying to Soroban:

- [ ] All circuits build without errors
- [ ] Movement circuit validates distance ≤ 2
- [ ] Attack circuit enforces honest hit/miss
- [ ] Bounds checking works (0-9 grid)
- [ ] Poseidon hash uses 3 inputs consistently
- [ ] Invalid proofs are rejected
- [ ] Test with actual salt values
- [ ] Export artifacts for frontend
- [ ] Document public input ordering
- [ ] Confirm UltraHonk backend (default)

---

## References

- **Noir Documentation:** https://noir-lang.org/docs
- **Noir Soroban Verifier:** https://github.com/noir-lang/noir-stellar
- **Stellar Game Studio:** https://github.com/Junman140/Stellar-Game-Studio
- **Soroban Docs:** https://soroban.stellar.org/
- **Protocol 25:** https://soroban.stellar.org/docs/protocol-25

---

## Contact & Questions

For circuit-specific questions:
1. Check TESTING_EXAMPLES.md for test cases
2. Review INTEGRATION.md for contract integration
3. See QUICK_REFERENCE.md for fast lookup

For game rules:
- Check README.md game flow section

For Soroban integration:
- Check INTEGRATION.md sections 2-4

---

## License

Same as project root (TBD)

---

**Status:** ✅ Circuits complete and ready for integration

**Last Updated:** 2026-02-13

**Version:** 1.0.0
