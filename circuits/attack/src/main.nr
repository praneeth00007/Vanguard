use dep::std::hash::poseidon;

fn main(
    // Private inputs (witnesses)
    attacker_x: u8,
    attacker_y: u8,
    attacker_salt: Field,
    defender_x: u8,
    defender_y: u8,
    defender_salt: Field,
    // Public inputs
    attacker_hash: Field,
    defender_hash: Field,
    target_x: u8,
    target_y: u8,
    vehicle_type: u8,
    action_type: u8,
    turn_counter: u32,
    claimed_hit: bool,
) {
    assert(vehicle_type <= 2, "invalid vehicle_type");
    assert(action_type == 1, "invalid action_type");
    let _ = turn_counter;

    let computed_attacker = poseidon::bn254::hash_3([
        attacker_x as Field,
        attacker_y as Field,
        attacker_salt,
    ]);
    assert(computed_attacker == attacker_hash, "attacker commitment mismatch");

    let computed_defender = poseidon::bn254::hash_3([
        defender_x as Field,
        defender_y as Field,
        defender_salt,
    ]);
    assert(computed_defender == defender_hash, "defender commitment mismatch");

    assert(attacker_x <= 9, "attacker_x out of bounds");
    assert(attacker_y <= 9, "attacker_y out of bounds");
    assert(defender_x <= 9, "defender_x out of bounds");
    assert(defender_y <= 9, "defender_y out of bounds");
    assert(target_x <= 9, "target_x out of bounds");
    assert(target_y <= 9, "target_y out of bounds");

    let dx = if attacker_x >= target_x {
        attacker_x - target_x
    } else {
        target_x - attacker_x
    };
    let dy = if attacker_y >= target_y {
        attacker_y - target_y
    } else {
        target_y - attacker_y
    };
    let manhattan_distance = dx + dy;

    let max_range = if vehicle_type == 0 {
        2
    } else if vehicle_type == 1 {
        3
    } else {
        4
    };

    assert(manhattan_distance <= max_range, "attack out of range");

    let hit = (defender_x == target_x) & (defender_y == target_y);
    assert(hit == claimed_hit, "hit flag mismatch");
}
