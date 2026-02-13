# Vanguard's Blindside Circuits - Quick Start

## 🚀 Installation

```bash
# Install Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Verify
nargo --version  # Should be >= 0.36.0
```

## 📁 Circuit Structure

```
circuits/
├── movement/     → Prove valid unit movement
├── attack/       → Prove hit/miss without revealing position
└── deployment/   → (Optional) Prove valid initial placement
```

## ⚡ Quick Commands

```bash
# Compile all circuits
cd circuits/movement && nargo compile
cd ../attack && nargo compile
cd ../deployment && nargo compile

# Run tests
cd circuits/movement && nargo execute
cd ../attack && nargo execute
cd ../deployment && nargo execute

# Generate proofs
cd circuits/movement && nargo prove && nargo verify
cd ../attack && nargo prove && nargo verify
cd ../deployment && nargo prove && nargo verify
```

## 🎮 Game Flow

### 1. Deployment
```
Player chooses (x, y) ∈ [0,9]²
Generates salt (32 bytes)
Computes commitment = Poseidon(x, y, salt)
Submits commitment to chain
```

### 2. Movement
```
Player moves from (x1, y1) → (x2, y2)
Manhattan distance ≤ 2
Generates proof:
  - Knows old position
  - Knows new position
  - Movement is valid
Updates commitment on-chain
```

### 3. Attack
```
Attacker targets (tx, ty)
Defender generates proof:
  - Knows actual position
  - Returns HIT or MISS
If HIT: HP -= 1
If HP = 0: Unit eliminated, game ends
```

## 🔒 Security Model

| What's Private | What's Public |
|----------------|---------------|
| Coordinates (x, y) | Commitments (hashes) |
| Salt | Target coordinates |
| Movement path | Hit/miss result |
| | Turn number |

## 📝 Circuit Inputs

### Movement Circuit
```noir
// Private
old_x, old_y, new_x, new_y, salt

// Public
old_hash, new_hash

// Constraints
✓ old_hash = Poseidon(old_x, old_y, salt)
✓ new_hash = Poseidon(new_x, new_y, salt)
✓ Manhattan distance ≤ 2
✓ All coords in [0, 9]
```

### Attack Circuit
```noir
// Private
x, y, salt

// Public
commitment, target_x, target_y

// Output
bool (true = HIT, false = MISS)

// Constraints
✓ commitment = Poseidon(x, y, salt)
✓ All coords in [0, 9]
```

### Deployment Circuit
```noir
// Private
x, y, salt

// Public
commitment

// Constraints
✓ commitment = Poseidon(x, y, salt)
✓ Coords in [0, 9]
```

## 🛠️ Integration Points

### Frontend (Next.js + Web Worker)
```typescript
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@noir-lang/backend_barretenberg';

// In Web Worker
const backend = new UltraHonkBackend(circuit);
const noir = new Noir(circuit);
const witness = await noir.generateWitness(inputs);
const proof = await backend.generateProof(witness);
```

### Soroban Hub Contract
```rust
// Pseudo-code
fn execute_move(proof: BytesN, new_hash: BytesN) {
    let public_inputs = vec![old_hash, new_hash];
    verifier::verify(proof, public_inputs)?;
    self.commitment = new_hash;
    self.turn += 1;
}
```

### Soroban Verifier Contract
```rust
// Uses official Noir UltraHonk verifier crate
fn verify(proof: BytesN, public_inputs: Vec<BytesN>) -> bool {
    // Official verifier implementation
    ultrahonk::verify(proof, public_inputs)
}
```

## 📊 Performance Targets

| Metric | Target | Acceptable |
|--------|--------|------------|
| Proof generation | < 1s | < 5s |
| Proof verification | < 100ms | < 500ms |
| Proof size | ~50KB | ~100KB |
| Circuit constraints | < 50 | < 100 |

## 🧪 Quick Test

```bash
# Test valid move
cd circuits/movement
cat > Prover.toml << EOF
old_x = "3"
old_y = "5"
new_x = "4"
new_y = "6"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
old_hash = "0x0000000000000000000000000000000000000000000000000000000000000000"
new_hash = "0x0000000000000000000000000000000000000000000000000000000000000000"
EOF

nargo execute  # Will fail on wrong hashes, but validates structure
```

## 🔗 Key Dependencies

- **Noir**: v1.x (>= 0.36.0) - Circuit compiler
- **UltraHonk**: Default backend (no config needed)
- **Poseidon**: `std::hash::poseidon::bn254::hash_3`
- **Barretenberg**: Proof backend (via noir_js)

## 📚 Documentation

- [README.md](./README.md) - Full circuit documentation
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Comprehensive test scenarios
- [CIRCUIT_IMPLEMENTATION_NOTES.md](./CIRCUIT_IMPLEMENTATION_NOTES.md) - Technical details

## 🐛 Common Issues

**Issue**: `nargo: command not found`
**Fix**: Run `noirup` and restart terminal

**Issue**: "Commitment mismatch"
**Fix**: Compute correct Poseidon hash for test inputs

**Issue**: "Manhattan distance exceeds 2"
**Fix**: Ensure |x2-x1| + |y2-y1| ≤ 2

**Issue**: "out of bounds"
**Fix**: Use coordinates in [0, 9] range

## ✅ Checklist

Before integrating with Soroban:

- [ ] All circuits compile without errors
- [ ] Test vectors pass `nargo execute`
- [ ] Proofs generate successfully
- [ ] Proofs verify successfully
- [ ] Circuit artifacts (.json) exported
- [ ] Public inputs documented
- [ ] Integration test plan created

## 🎯 Next Steps

1. ✅ Circuits implemented
2. ⏳ Compile and test circuits
3. ⏳ Export circuit artifacts
4. ⏳ Implement Web Worker proof generation
5. ⏳ Create Soroban verifier contract
6. ⏳ Create Soroban hub contract
7. ⏳ Build frontend UI
8. ⏳ End-to-end testing

---

**Ready to build?** Start with `nargo compile` in each circuit directory!
