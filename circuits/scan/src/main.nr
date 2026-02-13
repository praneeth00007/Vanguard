use dep::std::hash::poseidon;

fn main(
    // Private inputs
    scanner_x: u8,
    scanner_y: u8,
    scanner_salt: Field,
    defender_x: u8,
    defender_y: u8,
    defender_salt: Field,
    // Public inputs
    pub scanner_hash: Field,
    pub defender_hash: Field,
    pub scan_x: u8,
    pub scan_y: u8,
    pub vehicle_type: u8,
    pub action_type: u8,
    pub turn_counter: u32,
    pub claimed_scan_hit: bool,
) {
    assert(vehicle_type == 0, "scan only allowed for Cycle");
    assert(action_type == 2, "invalid action_type");
    let _ = turn_counter;

    let computed_scanner = poseidon::bn254::hash_3([
        scanner_x as Field,
        scanner_y as Field,
        scanner_salt,
    ]);
    assert(computed_scanner == scanner_hash, "scanner commitment mismatch");

    let computed_defender = poseidon::bn254::hash_3([
        defender_x as Field,
        defender_y as Field,
        defender_salt,
    ]);
    assert(computed_defender == defender_hash, "defender commitment mismatch");

    assert(scanner_x <= 9, "scanner_x out of bounds");
    assert(scanner_y <= 9, "scanner_y out of bounds");
    assert(defender_x <= 9, "defender_x out of bounds");
    assert(defender_y <= 9, "defender_y out of bounds");
    assert(scan_x <= 8, "scan_x out of bounds");
    assert(scan_y <= 8, "scan_y out of bounds");

    let in_x = (defender_x >= scan_x) & (defender_x <= scan_x + 1);
    let in_y = (defender_y >= scan_y) & (defender_y <= scan_y + 1);
    let scan_hit = in_x & in_y;

    assert(scan_hit == claimed_scan_hit, "scan hit flag mismatch");
}
