# Circuit Flow Diagrams

## Movement Circuit Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOVEMENT CIRCUIT                            │
│                                                                  │
│  Private Inputs                      Public Inputs              │
│  ┌──────────────┐                   ┌──────────────┐           │
│  │ old_x = 3    │                   │ old_hash     │           │
│  │ old_y = 5    │                   │ new_hash     │           │
│  │ new_x = 4    │                   └──────────────┘           │
│  │ new_y = 6    │                                               │
│  │ salt = 0x... │                                               │
│  └──────────────┘                                               │
│                                                                  │
│  Constraints:                                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 1. old_hash == Poseidon(old_x, old_y, salt)            │    │
│  │    ✓ Verify old position commitment                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 2. new_hash == Poseidon(new_x, new_y, salt)            │    │
│  │    ✓ Verify new position commitment                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 3. |new_x - old_x| + |new_y - old_y| ≤ 2               │    │
│  │    ✓ Verify Manhattan distance                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 4. All coordinates in [0, 9]                            │    │
│  │    ✓ Verify grid bounds                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Output: Proof ✓ (or constraint failure ✗)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Attack Circuit Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       ATTACK CIRCUIT                             │
│                                                                  │
│  Private Inputs                      Public Inputs              │
│  ┌──────────────┐                   ┌──────────────┐           │
│  │ x = 3        │                   │ commitment   │           │
│  │ y = 5        │                   │ target_x = 3 │           │
│  │ salt = 0x... │                   │ target_y = 5 │           │
│  └──────────────┘                   └──────────────┘           │
│                                                                  │
│  Constraints:                                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 1. commitment == Poseidon(x, y, salt)                   │    │
│  │    ✓ Verify defender's position commitment              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 2. All coordinates in [0, 9]                            │    │
│  │    ✓ Verify grid bounds                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 3. hit = (x == target_x) && (y == target_y)            │    │
│  │    → Compute hit/miss result                            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Output: bool (true = HIT, false = MISS)                       │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Circuit Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT CIRCUIT                            │
│                                                                  │
│  Private Inputs                      Public Inputs              │
│  ┌──────────────┐                   ┌──────────────┐           │
│  │ x = 5        │                   │ commitment   │           │
│  │ y = 5        │                   └──────────────┘           │
│  │ salt = 0x... │                                               │
│  └──────────────┘                                               │
│                                                                  │
│  Constraints:                                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 1. commitment == Poseidon(x, y, salt)                   │    │
│  │    ✓ Verify initial position commitment                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 2. x, y in [0, 9]                                       │    │
│  │    ✓ Verify initial placement is within grid            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Output: Proof ✓ (or constraint failure ✗)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Game State Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         GAME FLOW                                 │
└──────────────────────────────────────────────────────────────────┘

Phase 1: DEPLOYMENT
┌─────────────┐
│  Player 1   │  Chooses (3, 5), generates salt₁
│  Browser    │  Computes commitment₁ = Poseidon(3, 5, salt₁)
└──────┬──────┘  Generates deployment proof (optional)
       │
       │ [commitment₁, proof₁]
       ▼
┌─────────────┐
│  Soroban    │  Stores commitment₁
│  Hub        │  Sets p1_hp = 3
└─────────────┘

┌─────────────┐
│  Player 2   │  Chooses (7, 2), generates salt₂
│  Browser    │  Computes commitment₂ = Poseidon(7, 2, salt₂)
└──────┬──────┘  Generates deployment proof (optional)
       │
       │ [commitment₂, proof₂]
       ▼
┌─────────────┐
│  Soroban    │  Stores commitment₂
│  Hub        │  Sets p2_hp = 3
└─────────────┘  turn = 1 (Player 1's turn)

Phase 2: MOVEMENT
┌─────────────┐
│  Player 1   │  Moves from (3, 5) → (4, 6)
│  Browser    │  Computes new_commitment = Poseidon(4, 6, salt₁)
└──────┬──────┘  Generates movement proof
       │
       │ Private: old_x=3, old_y=5, new_x=4, new_y=6, salt₁
       │ Public: old_hash=commitment₁, new_hash=new_commitment
       │
       │ [proof, new_commitment]
       ▼
┌─────────────┐
│  Soroban    │  Calls verifier contract
│  Verifier   │  Verifies movement proof
└──────┬──────┘  Returns: ✓ Valid
       │
       ▼
┌─────────────┐
│  Soroban    │  Updates commitment₁ → new_commitment
│  Hub        │  turn = 2 (Player 2's turn)
└─────────────┘

Phase 3: ATTACK
┌─────────────┐
│  Player 2   │  Attacks target (4, 6)
│  Browser    │  Submits attack transaction
└──────┬──────┘
       │
       │ [target_x=4, target_y=6]
       ▼
┌─────────────┐
│  Soroban    │  Emits AttackEvent(target_x, target_y)
│  Hub        │  Awaits defense proof from Player 1
└─────────────┘
       │
       │ Player 1 sees attack
       ▼
┌─────────────┐
│  Player 1   │  Current position: (4, 6)
│  Browser    │  Target: (4, 6)
└──────┬──────┘  Generates attack defense proof
       │
       │ Private: x=4, y=6, salt₁
       │ Public: commitment=new_commitment, target_x=4, target_y=6
       │ Output: hit = true (HIT!)
       │
       │ [proof, hit=true]
       ▼
┌─────────────┐
│  Soroban    │  Calls verifier contract
│  Verifier   │  Verifies attack proof
└──────┬──────┘  Returns: ✓ Valid, hit=true
       │
       ▼
┌─────────────┐
│  Soroban    │  p1_hp = 3 - 1 = 2
│  Hub        │  Emits HitEvent(player1, 2 HP remaining)
└─────────────┘  turn = 3 (Player 1's turn)

Phase 4: VICTORY
(After 3 hits on Player 1)
┌─────────────┐
│  Soroban    │  p1_hp = 0
│  Hub        │  Emits GameOverEvent(winner=Player2)
└─────────────┘  Game ends
```

## Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                    DATA PRIVACY MODEL                          │
└───────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  NEVER ON-CHAIN     │  (Always secret)
├─────────────────────┤
│ • Coordinates (x,y) │
│ • Salt              │
│ • Movement paths    │
└─────────────────────┘
         │
         │ Hash with Poseidon
         ▼
┌─────────────────────┐
│  ON-CHAIN (PUBLIC)  │
├─────────────────────┤
│ • Commitments       │
│ • Proofs            │
│ • Hit/Miss results  │
│ • HP values         │
│ • Turn counter      │
└─────────────────────┘

Privacy Guarantee:
Commitments and proofs are ZERO-KNOWLEDGE
→ No information about actual position leaked
→ Only validity is verified
```

## Poseidon Hash Function

```
┌────────────────────────────────────────────────────────────┐
│              POSEIDON COMMITMENT SCHEME                     │
└────────────────────────────────────────────────────────────┘

Input:    [x, y, salt]
          ↓
       ┌─────────────────┐
       │ Poseidon Hash   │  BN254 curve
       │ (3 inputs)      │  Optimized for ZK
       └────────┬────────┘
                │
                ▼
Output:   commitment (Field element)

Properties:
✓ Deterministic: Same inputs → Same output
✓ One-way: Can't reverse commitment → (x, y, salt)
✓ Collision-resistant: Hard to find different inputs with same output
✓ ZK-friendly: Efficient in circuits (~20 constraints)
✓ Native support: Stellar Protocol 25 host function

Usage in Circuits:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
use dep::std::hash::poseidon;

let commitment = poseidon::bn254::hash_3([x, y, salt]);
assert(commitment == expected_commitment);
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Circuit Constraint Counts

```
┌──────────────────────────────────────────────────────────┐
│                 CONSTRAINT COMPLEXITY                     │
└──────────────────────────────────────────────────────────┘

Movement Circuit
┌────────────────────────────┬──────────────┐
│ Operation                  │ Constraints  │
├────────────────────────────┼──────────────┤
│ Poseidon hash (old)        │ ~20          │
│ Poseidon hash (new)        │ ~20          │
│ Manhattan distance         │ ~10          │
│ Bounds checks (4 coords)   │ ~8           │
├────────────────────────────┼──────────────┤
│ TOTAL                      │ ~58          │
└────────────────────────────┴──────────────┘

Attack Circuit
┌────────────────────────────┬──────────────┐
│ Operation                  │ Constraints  │
├────────────────────────────┼──────────────┤
│ Poseidon hash              │ ~20          │
│ Bounds checks (4 coords)   │ ~8           │
│ Equality checks (2)        │ ~4           │
├────────────────────────────┼──────────────┤
│ TOTAL                      │ ~32          │
└────────────────────────────┴──────────────┘

Deployment Circuit
┌────────────────────────────┬──────────────┐
│ Operation                  │ Constraints  │
├────────────────────────────┼──────────────┤
│ Poseidon hash              │ ~20          │
│ Bounds checks (2 coords)   │ ~4           │
├────────────────────────────┼──────────────┤
│ TOTAL                      │ ~24          │
└────────────────────────────┴──────────────┘

Note: Actual constraint counts may vary based on Noir compiler optimization.
These are estimates based on typical ZK circuit complexity.
```

## Manhattan Distance Visualization

```
┌────────────────────────────────────────────────────────┐
│            10x10 GRID - MOVEMENT RANGE                  │
└────────────────────────────────────────────────────────┘

  0 1 2 3 4 5 6 7 8 9
0 . . . . . . . . . .
1 . . . . . . . . . .
2 . . . . 2 . . . . .
3 . . . 2 1 2 . . . .
4 . . 2 1 X 1 2 . . .    X = Current position (4, 4)
5 . . . 2 1 2 . . . .    1 = Distance 1 (4 squares)
6 . . . . 2 . . . . .    2 = Distance 2 (8 squares)
7 . . . . . . . . . .
8 . . . . . . . . . .
9 . . . . . . . . . .

Valid moves from (4, 4):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Distance 0: (4,4) - Stay in place
Distance 1: (3,4) (5,4) (4,3) (4,5)
Distance 2: (2,4) (6,4) (4,2) (4,6)
            (3,3) (5,3) (3,5) (5,5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Manhattan Distance Formula:
distance = |x₂ - x₁| + |y₂ - y₁|

Constraint: distance ≤ 2
```

## Attack Hit Detection

```
┌────────────────────────────────────────────────────────┐
│                ATTACK SCENARIOS                         │
└────────────────────────────────────────────────────────┘

Scenario 1: DIRECT HIT
  Defender position: (3, 5)
  Attacker targets: (3, 5)
  ┌─────────────────────────────────────┐
  │ Circuit computes:                   │
  │   hit = (3 == 3) && (5 == 5)       │
  │   hit = true                        │
  └─────────────────────────────────────┘
  Result: HIT → HP -= 1

Scenario 2: NEAR MISS
  Defender position: (3, 5)
  Attacker targets: (4, 5)
  ┌─────────────────────────────────────┐
  │ Circuit computes:                   │
  │   hit = (3 == 4) && (5 == 5)       │
  │   hit = false                       │
  └─────────────────────────────────────┘
  Result: MISS → No damage

Scenario 3: FAR MISS
  Defender position: (3, 5)
  Attacker targets: (7, 2)
  ┌─────────────────────────────────────┐
  │ Circuit computes:                   │
  │   hit = (3 == 7) && (5 == 2)       │
  │   hit = false                       │
  └─────────────────────────────────────┘
  Result: MISS → No damage

Privacy: Attacker learns ONLY hit/miss
         Never learns actual coordinates!
```
