use std::hash::poseidon2;

// Deployment circuit for Vanguard's Blindside
// Proves initial unit placement is valid without revealing coordinates
// This is optional - deployment can be done by simply submitting commitment
// But this circuit ensures bounds checking happens in ZK

fn main(
    // Private inputs - initial position and salt
    x: Field,
    y: Field,
    salt: Field,
    
    // Public input - commitment to be stored on-chain
    commitment: pub Field
) {
    // Constraint 1: Verify commitment
    // commitment must equal Poseidon(x, y, salt)
    let computed_hash = poseidon2::Poseidon2::hash([x, y, salt], 3);
    assert(computed_hash == commitment, "Commitment mismatch");
    
    // Constraint 2: Verify grid bounds (0-9 for 10x10 grid)
    assert(x as u32 <= 9, "X coordinate out of bounds");
    assert(y as u32 <= 9, "Y coordinate out of bounds");
}
