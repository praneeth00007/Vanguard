use dep::std::hash::poseidon;

fn main(
    // Private inputs
    x: Field,
    y: Field,
    salt: Field,
    // Public inputs
    pub commitment: pub Field,
    pub target_x: pub Field,
    pub target_y: pub Field
) -> pub bool {
    // Constraint 1: Verify position commitment
    let computed_commitment = poseidon::bn254::hash_3([x, y, salt]);
    assert(computed_commitment == commitment, "Position commitment mismatch");

    // Grid bounds check (0-9)
    assert(x.lt(10), "x out of bounds");
    assert(y.lt(10), "y out of bounds");
    assert(target_x.lt(10), "target_x out of bounds");
    assert(target_y.lt(10), "target_y out of bounds");

    // Constraint 2 & 3: Check if attack hits
    let hit = (x == target_x) & (y == target_y);
    
    hit
}
