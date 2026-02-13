use std::hash::poseidon2;

// Movement circuit for Vanguard's Blindside
// Proves that a unit moved from one valid position to another
// without revealing the actual coordinates

fn main(
    // Private inputs - never revealed on-chain
    old_x: Field,
    old_y: Field,
    new_x: Field,
    new_y: Field,
    salt: Field,
    
    // Public inputs - verified on-chain
    old_hash: pub Field,
    new_hash: pub Field
) {
    // Constraint 1: Verify old position commitment
    // old_hash must equal Poseidon(old_x, old_y, salt)
    let computed_old_hash = poseidon2::Poseidon2::hash([old_x, old_y, salt], 3);
    assert(computed_old_hash == old_hash, "Old position hash mismatch");
    
    // Constraint 2: Verify new position commitment
    // new_hash must equal Poseidon(new_x, new_y, salt)
    let computed_new_hash = poseidon2::Poseidon2::hash([new_x, new_y, salt], 3);
    assert(computed_new_hash == new_hash, "New position hash mismatch");
    
    // Constraint 3: Verify grid bounds (0-9 for 10x10 grid)
    assert(old_x as u32 <= 9, "Old X out of bounds");
    assert(old_y as u32 <= 9, "Old Y out of bounds");
    assert(new_x as u32 <= 9, "New X out of bounds");
    assert(new_y as u32 <= 9, "New Y out of bounds");
    
    // Constraint 4: Verify Manhattan distance <= 2
    // |new_x - old_x| + |new_y - old_y| <= 2
    
    // Calculate absolute differences
    let dx = if new_x >= old_x {
        new_x - old_x
    } else {
        old_x - new_x
    };
    
    let dy = if new_y >= old_y {
        new_y - old_y
    } else {
        old_y - new_y
    };
    
    let manhattan_distance = dx + dy;
    
    // Ensure movement is valid (distance <= 2)
    assert(manhattan_distance as u32 <= 2, "Move distance exceeds maximum (2)");
}
