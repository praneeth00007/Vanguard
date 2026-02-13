use dep::std::hash::poseidon;

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
    pub commitment: pub Field
) {
    // Constraint 1: Verify commitment
    // commitment must equal Poseidon(x, y, salt)
    let computed_hash = poseidon::bn254::hash_3([x, y, salt]);
    assert(computed_hash == commitment, "Commitment mismatch");
    
    // Constraint 2: Verify grid bounds (0-9 for 10x10 grid)
    assert(x.lt(10), "X coordinate out of bounds");
    assert(y.lt(10), "Y coordinate out of bounds");
}
