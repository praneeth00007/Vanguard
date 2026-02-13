use std::hash::poseidon2;

// Attack circuit for Vanguard's Blindside
// Proves whether an attack hits or misses without revealing defender's position
// Defender proves they are (HIT) or are not (MISS) at the target coordinates

fn main(
    // Private inputs - defender's actual position and salt
    x: Field,
    y: Field,
    salt: Field,
    
    // Public inputs - commitment and attacker's target
    commitment: pub Field,
    target_x: pub Field,
    target_y: pub Field,
    
    // Public output - whether attack was a hit
    hit: pub bool
) {
    // Constraint 1: Verify defender's position commitment
    // commitment must equal Poseidon(x, y, salt)
    let computed_hash = poseidon2::Poseidon2::hash([x, y, salt], 3);
    assert(computed_hash == commitment, "Position commitment mismatch");
    
    // Constraint 2: Verify grid bounds (0-9 for 10x10 grid)
    assert(x as u32 <= 9, "X coordinate out of bounds");
    assert(y as u32 <= 9, "Y coordinate out of bounds");
    assert(target_x as u32 <= 9, "Target X out of bounds");
    assert(target_y as u32 <= 9, "Target Y out of bounds");
    
    // Constraint 3: Verify hit/miss logic
    // HIT if defender's actual position matches target
    let actual_hit = (x == target_x) & (y == target_y);
    assert(hit == actual_hit, "Hit result does not match actual position");
}
