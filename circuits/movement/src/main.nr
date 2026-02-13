use dep::std::hash::poseidon;

fn main(
    // Private inputs
    old_x: Field,
    old_y: Field,
    new_x: Field,
    new_y: Field,
    salt: Field,
    // Public inputs
    pub old_hash: pub Field,
    pub new_hash: pub Field
) {
    // Constraint 1: Verify old position commitment
    let old_commitment = poseidon::bn254::hash_3([old_x, old_y, salt]);
    assert(old_commitment == old_hash, "Old position commitment mismatch");

    // Constraint 2: Verify new position commitment
    let new_commitment = poseidon::bn254::hash_3([new_x, new_y, salt]);
    assert(new_commitment == new_hash, "New position commitment mismatch");

    // Constraint 3: Grid bounds check (0-9)
    assert(old_x.lt(10), "old_x out of bounds");
    assert(old_y.lt(10), "old_y out of bounds");
    assert(new_x.lt(10), "new_x out of bounds");
    assert(new_y.lt(10), "new_y out of bounds");

    // Constraint 4: Manhattan distance <= 2
    // Calculate absolute differences
    let dx = if new_x.lt(old_x) {
        old_x - new_x
    } else {
        new_x - old_x
    };

    let dy = if new_y.lt(old_y) {
        old_y - new_y
    } else {
        new_y - old_y
    };

    let manhattan_distance = dx + dy;
    assert(manhattan_distance.lte(2), "Manhattan distance exceeds 2");
}
