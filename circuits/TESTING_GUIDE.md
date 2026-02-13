# Circuit Testing Guide

## Prerequisites

```bash
# Install Noir (v1.x, >= 0.36.0)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Verify installation
nargo --version
```

## Test Scenarios

### 1. Movement Circuit Tests

#### Test 1: Valid Move (Right + Up)
```toml
# Prover.toml
old_x = "3"
old_y = "5"
new_x = "4"
new_y = "6"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
old_hash = "0x..." # Compute: Poseidon(3, 5, salt)
new_hash = "0x..." # Compute: Poseidon(4, 6, salt)
```

**Expected**: ✅ Proof generates successfully
**Manhattan Distance**: |4-3| + |6-5| = 2 (valid)

#### Test 2: Valid Move (Stay in Place)
```toml
old_x = "5"
old_y = "5"
new_x = "5"
new_y = "5"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
old_hash = "0x..." # Poseidon(5, 5, salt)
new_hash = "0x..." # Poseidon(5, 5, salt) - same as old
```

**Expected**: ✅ Proof generates (distance = 0, valid)

#### Test 3: Invalid Move (Too Far)
```toml
old_x = "3"
old_y = "5"
new_x = "6"
new_y = "7"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
old_hash = "0x..."
new_hash = "0x..."
```

**Expected**: ❌ Constraint fails
**Manhattan Distance**: |6-3| + |7-5| = 5 (exceeds limit of 2)

#### Test 4: Invalid Move (Out of Bounds)
```toml
old_x = "9"
old_y = "9"
new_x = "10"
new_y = "9"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
old_hash = "0x..."
new_hash = "0x..."
```

**Expected**: ❌ Constraint fails (new_x = 10 is out of bounds)

#### Test 5: Invalid Commitment
```toml
old_x = "3"
old_y = "5"
new_x = "4"
new_y = "5"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
old_hash = "0x0000000000000000000000000000000000000000000000000000000000000001" # Wrong hash
new_hash = "0x..."
```

**Expected**: ❌ Commitment mismatch

### 2. Attack Circuit Tests

#### Test 6: Direct Hit
```toml
x = "3"
y = "5"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
commitment = "0x..." # Poseidon(3, 5, salt)
target_x = "3"
target_y = "5"
```

**Expected**: ✅ Returns `true` (HIT)

#### Test 7: Near Miss
```toml
x = "3"
y = "5"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
commitment = "0x..."
target_x = "4"
target_y = "5"
```

**Expected**: ✅ Returns `false` (MISS)

#### Test 8: Invalid Target (Out of Bounds)
```toml
x = "3"
y = "5"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
commitment = "0x..."
target_x = "10"
target_y = "5"
```

**Expected**: ❌ Constraint fails (target out of bounds)

#### Test 9: Invalid Commitment
```toml
x = "3"
y = "5"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
commitment = "0x0000000000000000000000000000000000000000000000000000000000000001"
target_x = "3"
target_y = "5"
```

**Expected**: ❌ Commitment mismatch

### 3. Deployment Circuit Tests

#### Test 10: Valid Deployment
```toml
x = "5"
y = "5"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
commitment = "0x..." # Poseidon(5, 5, salt)
```

**Expected**: ✅ Proof generates successfully

#### Test 11: Corner Deployment
```toml
x = "0"
y = "0"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
commitment = "0x..."
```

**Expected**: ✅ Valid (0,0 is a legal position)

#### Test 12: Invalid Deployment (Out of Bounds)
```toml
x = "10"
y = "5"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
commitment = "0x..."
```

**Expected**: ❌ Constraint fails

## Running Tests

### Compile Circuits

```bash
cd circuits/movement
nargo compile

cd ../attack
nargo compile

cd ../deployment
nargo compile
```

### Execute with Test Inputs

```bash
cd circuits/movement
nargo execute

# Check output
cat target/witness.gz
```

### Generate Proofs

```bash
cd circuits/movement
nargo prove

# Verify proof
nargo verify
```

## Computing Poseidon Hashes

To compute the actual hash values for test inputs, use this Node.js script with `@noir-lang/noir_js`:

```javascript
import { Noir } from '@noir-lang/noir_js';
import circuit from './target/movement.json' assert { type: 'json' };

const noir = new Noir(circuit);

const inputs = {
  old_x: '3',
  old_y: '5',
  new_x: '4',
  new_y: '6',
  salt: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  old_hash: '0x0', // Placeholder
  new_hash: '0x0'  // Placeholder
};

// This will fail with commitment mismatch, but you can extract the computed hash from error
const witness = await noir.generateWitness(inputs).catch(e => console.log(e));
```

Or use a helper script to compute hashes directly:

```javascript
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

// Compute Poseidon hash
const hash = await backend.computePoseidon([
  BigInt(3),  // x
  BigInt(5),  // y  
  BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
]);

console.log('Hash:', '0x' + hash.toString(16));
```

## Automated Test Script

```bash
#!/bin/bash

echo "Testing Movement Circuit..."
cd circuits/movement
nargo test || echo "Movement tests failed"

echo "Testing Attack Circuit..."
cd ../attack
nargo test || echo "Attack tests failed"

echo "Testing Deployment Circuit..."
cd ../deployment  
nargo test || echo "Deployment tests failed"

echo "All tests complete!"
```

Save as `test-circuits.sh` and run:

```bash
chmod +x test-circuits.sh
./test-circuits.sh
```

## Integration Testing

### End-to-End Test Flow

1. **Deploy Phase**:
   - Player 1 generates commitment for (3, 5)
   - Player 2 generates commitment for (7, 2)
   - Both submit to hub contract

2. **Movement Phase**:
   - Player 1 moves from (3, 5) → (4, 6)
   - Generate movement proof
   - Submit proof + new commitment to hub
   - Hub verifies and updates

3. **Attack Phase**:
   - Player 1 attacks (7, 2)
   - Player 2 generates defense proof
   - Returns HIT
   - HP decremented
   - If HP = 0, game ends

### Test With Mock Data

Use these consistent test values across all circuits:

**Player 1**:
- Position: (3, 5)
- Salt: `0x1111111111111111111111111111111111111111111111111111111111111111`

**Player 2**:
- Position: (7, 2)
- Salt: `0x2222222222222222222222222222222222222222222222222222222222222222`

## Performance Benchmarks

Record timing for each operation:

| Operation | Expected Time | Acceptable |
|-----------|--------------|------------|
| Compile | < 5s | < 10s |
| Execute | < 1s | < 2s |
| Prove | < 2s | < 5s |
| Verify | < 100ms | < 500ms |

## Debugging Tips

### 1. Constraint Failure

If `nargo execute` fails:
```bash
# Add print statements in circuit
std::println(f"old_x: {old_x}");
std::println(f"computed_hash: {old_commitment}");
std::println(f"expected_hash: {old_hash}");
```

### 2. Proof Generation Fails

Check:
- All inputs are valid Field elements
- Witness generation succeeds first (`nargo execute`)
- Backend is properly initialized

### 3. Verification Fails

- Ensure public inputs match exactly
- Check proof bytes are not corrupted
- Verify using same backend that generated proof

## Common Errors

### Error: "old_x out of bounds"
**Cause**: Input value >= 10
**Fix**: Use values in [0, 9] range

### Error: "Manhattan distance exceeds 2"
**Cause**: Move too far
**Fix**: Ensure |new_x - old_x| + |new_y - old_y| ≤ 2

### Error: "Commitment mismatch"
**Cause**: Hash doesn't match Poseidon(x, y, salt)
**Fix**: Compute correct hash value for test inputs

### Error: "Field overflow"
**Cause**: Value too large for Field
**Fix**: Use values that fit in ~254 bits

## Next Steps

After circuits pass all tests:

1. ✅ Generate circuit artifacts (JSON)
2. ⏳ Implement Web Worker proof generation
3. ⏳ Create test vectors for Soroban contracts
4. ⏳ Integrate with frontend UI
5. ⏳ End-to-end game testing
