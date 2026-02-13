# Circuit Implementation Notes

## Noir v1.x Poseidon API

There are two Poseidon implementations available in Noir stdlib:

### Option 1: `std::hash::poseidon` (Recommended)
```noir
use dep::std::hash::poseidon;
let hash = poseidon::bn254::hash_3([field1, field2, field3]);
```

### Option 2: `std::hash::poseidon2`
```noir  
use std::hash::poseidon2;
let hash = poseidon2::Poseidon2::hash([field1, field2, field3], 3);
```

**Our circuits use Option 1** (`poseidon::bn254::hash_3`) as it:
- Explicitly targets BN254 curve (Stellar's curve)
- Matches Stellar's native Poseidon host function
- Simpler, more direct API

## Field Arithmetic & Bounds Checking

### Comparison Methods in Noir v1.x

For `Field` types, use these comparison methods:
- `.lt(value)` - less than
- `.lte(value)` - less than or equal
- `==` - equality  

### Grid Bounds (0-9)

To check if a coordinate is in [0, 9]:
```noir
assert(x.lt(10), "x out of bounds");
```

This works because Field values are non-negative in this context, so `x < 10` ensures `0 ≤ x ≤ 9`.

### Manhattan Distance

To compute `|a - b|` for Fields:
```noir
let diff = if a.lt(b) {
    b - a
} else {
    a - b  
};
```

## Circuit Design Patterns

### Movement Circuit Pattern
1. Verify old commitment
2. Verify new commitment  
3. Check bounds
4. Check movement constraints

### Attack Circuit Pattern
1. Verify defender commitment
2. Check bounds
3. Compute and return hit/miss boolean

### Deployment Circuit Pattern (Optional)
1. Verify commitment
2. Check initial placement bounds

## Public vs Private Inputs

**Noir v1.x Syntax:**
```noir
fn main(
    private_input: Field,           // Private by default
    pub public_input: pub Field     // Explicitly public
) -> pub bool {                      // Public return value
    // ...
}
```

## Testing Strategy

1. **Valid Cases**: Test with correct inputs that satisfy all constraints
2. **Invalid Coordinates**: Test out-of-bounds coordinates
3. **Invalid Movement**: Test Manhattan distance > 2
4. **Invalid Commitments**: Test with mismatched commitments
5. **Edge Cases**: Test boundary coordinates (0, 9)

## Integration with Soroban

The Soroban hub contract will:
1. Store commitments (Field values as bytes)
2. Accept proof bytes from frontend
3. Call verifier contract with proof + public inputs
4. Update game state based on verification result

**Public Inputs Sent to Verifier:**
- Movement: `[old_hash, new_hash]`
- Attack: `[commitment, target_x, target_y]` + return value `hit: bool`

## Security Considerations

### Salt Requirements
- Must be 32 bytes (fits in a Field element)
- Generated with cryptographically secure randomness
- Never reused across games
- Never revealed publicly

### Preventing Replay Attacks
The hub contract must:
- Track used commitments per game
- Enforce turn ordering
- Increment nonce/turn counter
- Reject proofs with outdated commitments

### Privacy Guarantees
- Coordinates never leave the user's browser (except when unit eliminated)
- Proofs are zero-knowledge (reveal nothing beyond validity)
- Only commitments are stored on-chain
- Attacker learns only HIT/MISS, not actual coordinates

## Performance Considerations

### Circuit Complexity
- Movement: ~20-30 constraints (lightweight)
- Attack: ~15-20 constraints (lightweight)
- Deployment: ~10 constraints (minimal)

### Proof Generation Time
With UltraHonk and Web Workers:
- Expected: < 2 seconds per proof
- Acceptable: < 5 seconds per proof
- Target: < 1 second for production

### Proof Size
UltraHonk proofs are:
- Larger than Groth16 (~50-100KB)
- But no trusted setup required
- Faster verification on-chain

## Future Optimizations

1. **Batch Verification**: Verify multiple proofs in one transaction
2. **Proof Caching**: Cache verification keys
3. **Circuit Optimization**: Minimize constraint count
4. **Parallel Proving**: Generate multiple proofs concurrently

## Known Limitations

1. **Single Unit**: Currently supports one unit per player
2. **Fixed Grid**: 10x10 grid is hardcoded
3. **Fixed Movement**: Manhattan distance = 2 is hardcoded
4. **No Obstacles**: No terrain or blocking mechanics

These can be extended in future versions while maintaining the same ZK architecture.
