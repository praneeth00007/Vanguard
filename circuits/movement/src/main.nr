use dep::std::hash::poseidon;

fn main(
    // Private inputs
    old_x: u8,
    old_y: u8,
    new_x: u8,
    new_y: u8,
    salt: Field,
    // Public inputs
    pub old_hash: Field,
    pub new_hash: Field,
    pub vehicle_type: u8,
    pub action_type: u8,
    pub turn_counter: u32,
) {
    // Action + vehicle validation
    assert(vehicle_type <= 2, "invalid vehicle_type");
    assert(action_type == 0, "invalid action_type");
    let _ = turn_counter;

    // Constraint 1: Verify old position commitment
    let old_commitment = poseidon::bn254::hash_3([old_x as Field, old_y as Field, salt]);
    assert(old_commitment == old_hash, "old position commitment mismatch");

    // Constraint 2: Verify new position commitment
    let new_commitment = poseidon::bn254::hash_3([new_x as Field, new_y as Field, salt]);
    assert(new_commitment == new_hash, "new position commitment mismatch");

    // Constraint 3: Grid bounds check (0-9)
    assert(old_x <= 9, "old_x out of bounds");
    assert(old_y <= 9, "old_y out of bounds");
    assert(new_x <= 9, "new_x out of bounds");
    assert(new_y <= 9, "new_y out of bounds");

    // Constraint 4: Manhattan distance per vehicle
    let dx = if new_x >= old_x { new_x - old_x } else { old_x - new_x };
    let dy = if new_y >= old_y { new_y - old_y } else { old_y - new_y };
    let manhattan_distance = dx + dy;

    let max_range = if vehicle_type == 0 {
        3
    } else if vehicle_type == 1 {
        2
    } else {
        1
    };

    assert(manhattan_distance <= max_range, "movement out of range");
}
