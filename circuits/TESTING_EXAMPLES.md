# Testing Examples for Vanguard's Blindside Circuits

This document provides concrete examples for testing each circuit locally.

---

## Prerequisites

```bash
# Install Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Verify installation
nargo --version  # Should be >= 0.38.0
```

---

## 1. Movement Circuit Test

### Scenario: Player moves from (3,5) to (4,6)

**Step 1: Update Prover.toml**

Edit `circuits/movement/Prover.toml`:

```toml
# Private inputs
old_x = "3"
old_y = "5"
new_x = "4"
new_y = "6"
salt = "12345"

# Public inputs
# Note: In practice, these would be pre-computed
# For testing, we'll compute them via the circuit
old_hash = "0"  # Will fail initially - compute using hash
new_hash = "0"  # Will fail initially - compute using hash
```

**Step 2: Compute Hashes**

You need to compute the actual Poseidon hashes. For testing, you can:

Option A: Use a temporary test circuit to compute hashes:

```noir
// temp_hash_computer.nr
use std::hash::poseidon2;

fn main(
    x: Field,
    y: Field,
    salt: Field
) -> pub Field {
    poseidon2::Poseidon2::hash([x, y, salt], 3)
}
```

Option B: Use the Noir REPL or a small test script

**Step 3: Build and Prove**

```bash
cd circuits/movement

# Build circuit
nargo build

# Generate proof
nargo prove

# If successful, verify
nargo verify
```

**Expected Output:**
```
✅ Proof generated successfully
✅ Proof verified successfully
```

---

## 2. Attack Circuit Test (HIT scenario)

### Scenario: Defender at (7,2), attacker targets (7,2) → HIT

**Edit `circuits/attack/Prover.toml`:**

```toml
# Private inputs - defender's actual position
x = "7"
y = "2"
salt = "12345"

# Public inputs
commitment = "0"  # Compute as Poseidon(7, 2, 12345)
target_x = "7"
target_y = "2"

# Public output
hit = true  # Should be true since x==target_x and y==target_y
```

**Test:**
```bash
cd circuits/attack
nargo build
nargo prove
nargo verify
```

---

## 3. Attack Circuit Test (MISS scenario)

### Scenario: Defender at (7,2), attacker targets (5,5) → MISS

**Edit `circuits/attack/Prover.toml`:**

```toml
# Private inputs - defender's actual position
x = "7"
y = "2"
salt = "12345"

# Public inputs
commitment = "0"  # Compute as Poseidon(7, 2, 12345)
target_x = "5"
target_y = "5"

# Public output
hit = false  # Should be false since x!=target_x or y!=target_y
```

**Test:**
```bash
cd circuits/attack
nargo build
nargo prove
nargo verify
```

---

## 4. Invalid Movement Test (Distance > 2)

### Scenario: Player tries to move from (3,5) to (8,9) → Should FAIL

**Edit `circuits/movement/Prover.toml`:**

```toml
old_x = "3"
old_y = "5"
new_x = "8"  # Distance = |8-3| + |9-5| = 5+4 = 9 > 2
new_y = "9"
salt = "12345"

old_hash = "0"  # Compute correctly
new_hash = "0"  # Compute correctly
```

**Test:**
```bash
cd circuits/movement
nargo prove
```

**Expected Output:**
```
❌ Error: Constraint failed: Move distance exceeds maximum (2)
```

---

## 5. Invalid Attack Test (Lying about hit)

### Scenario: Defender at (7,2), attacker targets (7,2), but defender claims MISS → Should FAIL

**Edit `circuits/attack/Prover.toml`:**

```toml
x = "7"
y = "2"
salt = "12345"

commitment = "0"  # Compute as Poseidon(7, 2, 12345)
target_x = "7"
target_y = "2"

hit = false  # LIE: should be true, but claiming false
```

**Test:**
```bash
cd circuits/attack
nargo prove
```

**Expected Output:**
```
❌ Error: Constraint failed: Hit result does not match actual position
```

---

## 6. Computing Poseidon Hashes

### Method 1: Use Noir Test Circuit

Create `circuits/hash_helper/src/main.nr`:

```noir
use std::hash::poseidon2;

fn main(
    x: pub Field,
    y: pub Field,
    salt: pub Field
) {
    let hash = poseidon2::Poseidon2::hash([x, y, salt], 3);
    std::println(hash);
}
```

Run:
```bash
cd circuits/hash_helper
nargo build
nargo execute
```

### Method 2: Use TypeScript (for frontend consistency)

```typescript
// hash-helper.ts
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@noir-lang/backend_barretenberg';

async function computePoseidon(x: number, y: number, salt: string) {
  // Use a simple circuit that outputs the hash
  const inputs = {
    x: x.toString(),
    y: y.toString(),
    salt: salt
  };
  
  // The circuit should output the hash as public output
  const backend = new UltraHonkBackend(hashCircuit);
  const noir = new Noir(hashCircuit, backend);
  const result = await noir.execute(inputs);
  
  return result.returnValue;
}

// Test
const hash = await computePoseidon(3, 5, "12345");
console.log("Hash:", hash);
```

---

## 7. Complete Game Flow Test

This example shows a full game sequence.

### Setup

**Player 1:**
- Position: (3, 5)
- Salt: "11111"
- Commitment: `hash_1 = Poseidon(3, 5, "11111")`

**Player 2:**
- Position: (7, 2)
- Salt: "22222"
- Commitment: `hash_2 = Poseidon(7, 2, "22222")`

### Turn 1: P1 Moves (3,5) → (4,6)

```bash
cd circuits/movement
# Update Prover.toml with:
# old_x=3, old_y=5, new_x=4, new_y=6, salt=11111
# old_hash=hash_1, new_hash=Poseidon(4,6,11111)
nargo prove
# Submit proof to contract
```

### Turn 2: P2 Attacks (4,6)

```bash
cd circuits/attack
# Update Prover.toml with:
# x=4, y=6, salt=11111
# commitment=Poseidon(4,6,11111), target_x=4, target_y=6, hit=true
nargo prove
# Submit proof to contract (P1 takes damage)
```

### Turn 3: P1 Moves (4,6) → (5,5)

```bash
cd circuits/movement
# Update Prover.toml with:
# old_x=4, old_y=6, new_x=5, new_y=5, salt=11111
# old_hash=Poseidon(4,6,11111), new_hash=Poseidon(5,5,11111)
nargo prove
```

### Turn 4: P2 Attacks (5,5)

```bash
cd circuits/attack
# x=5, y=5, salt=11111
# commitment=Poseidon(5,5,11111), target_x=5, target_y=5, hit=true
nargo prove
# Submit proof (P1 takes damage again)
```

---

## 8. Debugging Tips

### Issue: "Constraint failed" errors

**Solution:**
1. Check that all coordinates are 0-9
2. For movement: verify Manhattan distance ≤ 2
3. For attack: verify hit/miss matches actual position

### Issue: Hash mismatch errors

**Solution:**
1. Ensure commitment was computed with same inputs: `Poseidon(x, y, salt)`
2. Check salt matches across operations
3. Verify hash function has 3 inputs

### Issue: Build fails

**Solution:**
```bash
# Clean and rebuild
nargo clean
nargo build
```

### Issue: Type errors

**Solution:**
- Ensure all inputs in Prover.toml are quoted strings
- Field elements should be numeric strings
- Booleans should be lowercase: `true` or `false`

---

## 9. Automated Testing Script

```bash
#!/bin/bash
# test-all-circuits.sh

set -e

echo "Testing Movement Circuit..."
cd circuits/movement
nargo clean
nargo build
echo "✅ Movement circuit built"

echo ""
echo "Testing Attack Circuit..."
cd ../attack
nargo clean
nargo build
echo "✅ Attack circuit built"

echo ""
echo "Testing Deployment Circuit..."
cd ../deployment
nargo clean
nargo build
echo "✅ Deployment circuit built"

echo ""
echo "🎉 All circuits built successfully!"
```

Run:
```bash
chmod +x test-all-circuits.sh
./test-all-circuits.sh
```

---

## 10. Next Steps After Circuit Testing

Once circuits are working locally:

1. **Export artifacts:**
   ```bash
   cd circuits/movement && nargo export
   cd ../attack && nargo export
   ```

2. **Copy to frontend:**
   ```bash
   cp circuits/movement/target/movement.json frontend/public/circuits/
   cp circuits/attack/target/attack.json frontend/public/circuits/
   ```

3. **Test with noir_js:**
   - Implement Web Worker
   - Generate proofs in browser
   - Verify locally before submitting to chain

4. **Deploy to Soroban:**
   - Deploy verifier contract
   - Deploy hub contract
   - Submit proofs from frontend

---

## Summary

✅ **Valid Tests:**
- Movement within distance ≤ 2
- Attack with honest hit/miss
- Coordinates within 0-9

❌ **Invalid Tests (Should Fail):**
- Movement distance > 2
- Coordinates outside 0-9
- Lying about hit/miss
- Wrong commitment/hash

All tests should pass locally before on-chain deployment.
