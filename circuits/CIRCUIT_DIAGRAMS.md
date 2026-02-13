# Circuit Logic Diagrams

Visual representation of the ZK circuit constraints and data flow.

---

## Movement Circuit Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MOVEMENT CIRCUIT                         │
│                                                             │
│  PRIVATE INPUTS (Never revealed)                           │
│  ┌──────────────────────────────────────────┐              │
│  │ old_x, old_y, new_x, new_y, salt        │              │
│  └────────────┬─────────────────────────────┘              │
│               │                                             │
│               ▼                                             │
│  ┌────────────────────────────────────────┐                │
│  │  Constraint 1: Verify Old Commitment   │                │
│  │  computed = Poseidon(old_x, old_y, salt) │              │
│  │  assert(computed == old_hash)          │                │
│  └────────────┬───────────────────────────┘                │
│               │                                             │
│               ▼                                             │
│  ┌────────────────────────────────────────┐                │
│  │  Constraint 2: Verify New Commitment   │                │
│  │  computed = Poseidon(new_x, new_y, salt) │              │
│  │  assert(computed == new_hash)          │                │
│  └────────────┬───────────────────────────┘                │
│               │                                             │
│               ▼                                             │
│  ┌────────────────────────────────────────┐                │
│  │  Constraint 3: Bounds Checking         │                │
│  │  assert(0 ≤ old_x, old_y ≤ 9)          │                │
│  │  assert(0 ≤ new_x, new_y ≤ 9)          │                │
│  └────────────┬───────────────────────────┘                │
│               │                                             │
│               ▼                                             │
│  ┌────────────────────────────────────────┐                │
│  │  Constraint 4: Distance Check          │                │
│  │  dx = |new_x - old_x|                  │                │
│  │  dy = |new_y - old_y|                  │                │
│  │  assert(dx + dy ≤ 2)                   │                │
│  └────────────┬───────────────────────────┘                │
│               │                                             │
│               ▼                                             │
│  PUBLIC INPUTS (Verified on-chain)                         │
│  ┌──────────────────────────────────────────┐              │
│  │ old_hash, new_hash                      │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
│  ✅ Proof Valid: Movement is legal                         │
└─────────────────────────────────────────────────────────────┘
```

### Example: Valid Move

```
Player at (3, 5) moves to (4, 6)
Salt: 12345

Private:
  old_x = 3, old_y = 5
  new_x = 4, new_y = 6
  salt = 12345

Public:
  old_hash = Poseidon(3, 5, 12345) = 0xabc...
  new_hash = Poseidon(4, 6, 12345) = 0xdef...

Checks:
  ✅ old_hash matches computed hash
  ✅ new_hash matches computed hash
  ✅ All coords in [0, 9]
  ✅ Distance = |4-3| + |6-5| = 1 + 1 = 2 ≤ 2

Result: ✅ VALID PROOF
```

### Example: Invalid Move (Too Far)

```
Player at (3, 5) tries to move to (8, 9)

Distance = |8-3| + |9-5| = 5 + 4 = 9

Checks:
  ✅ old_hash matches
  ✅ new_hash matches
  ✅ All coords in bounds
  ❌ Distance = 9 > 2 ← CONSTRAINT FAILS

Result: ❌ PROOF GENERATION FAILS
```

---

## Attack Circuit Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     ATTACK CIRCUIT                          │
│                                                             │
│  PRIVATE INPUTS (Defender's secret)                        │
│  ┌──────────────────────────────────────────┐              │
│  │ x, y, salt                              │              │
│  └────────────┬─────────────────────────────┘              │
│               │                                             │
│               ▼                                             │
│  ┌────────────────────────────────────────┐                │
│  │  Constraint 1: Verify Commitment       │                │
│  │  computed = Poseidon(x, y, salt)       │                │
│  │  assert(computed == commitment)        │                │
│  └────────────┬───────────────────────────┘                │
│               │                                             │
│               ▼                                             │
│  ┌────────────────────────────────────────┐                │
│  │  Constraint 2: Bounds Checking         │                │
│  │  assert(0 ≤ x, y ≤ 9)                  │                │
│  │  assert(0 ≤ target_x, target_y ≤ 9)    │                │
│  └────────────┬───────────────────────────┘                │
│               │                                             │
│               ▼                                             │
│  ┌────────────────────────────────────────┐                │
│  │  Constraint 3: Honest Hit Detection    │                │
│  │  actual_hit = (x == target_x) &&       │                │
│  │               (y == target_y)          │                │
│  │  assert(hit == actual_hit)             │                │
│  └────────────┬───────────────────────────┘                │
│               │                                             │
│               ▼                                             │
│  PUBLIC INPUTS (Known to attacker)                         │
│  ┌──────────────────────────────────────────┐              │
│  │ commitment, target_x, target_y, hit     │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
│  ✅ Proof Valid: Hit/miss is honest                        │
└─────────────────────────────────────────────────────────────┘
```

### Example: HIT Scenario

```
Defender at (7, 2), Attacker targets (7, 2)
Salt: 12345

Private:
  x = 7, y = 2, salt = 12345

Public:
  commitment = Poseidon(7, 2, 12345) = 0xabc...
  target_x = 7, target_y = 2
  hit = true

Checks:
  ✅ commitment matches Poseidon(7, 2, 12345)
  ✅ All coords in [0, 9]
  ✅ actual_hit = (7 == 7 && 2 == 2) = true
  ✅ hit == actual_hit (true == true)

Result: ✅ VALID PROOF (Hit confirmed)
```

### Example: MISS Scenario

```
Defender at (7, 2), Attacker targets (5, 5)
Salt: 12345

Private:
  x = 7, y = 2, salt = 12345

Public:
  commitment = Poseidon(7, 2, 12345) = 0xabc...
  target_x = 5, target_y = 5
  hit = false

Checks:
  ✅ commitment matches Poseidon(7, 2, 12345)
  ✅ All coords in [0, 9]
  ✅ actual_hit = (7 == 5 && 2 == 5) = false
  ✅ hit == actual_hit (false == false)

Result: ✅ VALID PROOF (Miss confirmed)
```

### Example: LYING Attempt (Fails)

```
Defender at (7, 2), Attacker targets (7, 2)
Defender tries to claim MISS

Private:
  x = 7, y = 2, salt = 12345

Public:
  commitment = Poseidon(7, 2, 12345) = 0xabc...
  target_x = 7, target_y = 2
  hit = false ← LIE

Checks:
  ✅ commitment matches
  ✅ All coords in bounds
  ✅ actual_hit = (7 == 7 && 2 == 2) = true
  ❌ hit == actual_hit (false != true) ← CONSTRAINT FAILS

Result: ❌ PROOF GENERATION FAILS (Cannot lie)
```

---

## Poseidon Hash Commitment

```
┌──────────────────────────────────────────────┐
│         Poseidon2 Hash Function              │
│                                              │
│  Input:  [x, y, salt]  (3 Field elements)   │
│  Output: hash          (1 Field element)    │
│                                              │
│  Properties:                                 │
│  • Collision-resistant                       │
│  • One-way (cannot reverse)                  │
│  • ZK-friendly (efficient in circuits)       │
│  • Deterministic (same inputs → same hash)   │
│                                              │
│  Example:                                    │
│  Poseidon([3, 5, 12345]) → 0xabc123...       │
│  Poseidon([4, 6, 12345]) → 0xdef456...       │
│                                              │
│  Security:                                   │
│  • Without salt, cannot determine (x, y)     │
│  • Salt must remain private forever          │
│  • Same salt used across all moves           │
└──────────────────────────────────────────────┘
```

---

## Game State Transition Diagram

```
                    DEPLOYMENT PHASE
                    ────────────────
                    P1: commit_1
                    P2: commit_2
                          │
                          ▼
                     GAME ACTIVE
                    ────────────────
                          │
          ┌───────────────┴───────────────┐
          │                               │
      P1 TURN                         P2 TURN
          │                               │
    ┌─────┴─────┐                   ┌─────┴─────┐
    │           │                   │           │
  MOVE      ATTACK                MOVE      ATTACK
    │           │                   │           │
    │      ┌────┴─────┐             │      ┌────┴─────┐
    │      │          │             │      │          │
    │    HIT        MISS            │    HIT        MISS
    │      │          │             │      │          │
    │   P2 HP--      │             │   P1 HP--      │
    │      │          │             │      │          │
    └──────┴──────────┴─────────────┴──────┴──────────┘
          │                               │
          ▼                               ▼
    P2 HP > 0?                      P1 HP > 0?
          │                               │
          NO                              NO
          │                               │
          ▼                               ▼
    P1 WINS!                        P2 WINS!
```

### Turn-by-Turn Example

```
Turn 1: P1 MOVE
  old_pos: (3,5) → new_pos: (4,6)
  Proof: Movement circuit
  Result: commit_1 updated

Turn 2: P2 ATTACK (targets 4,6)
  Defender: P1 at (4,6)
  Proof: Attack circuit (HIT)
  Result: P1 HP: 3 → 2

Turn 3: P1 MOVE
  old_pos: (4,6) → new_pos: (5,5)
  Proof: Movement circuit
  Result: commit_1 updated

Turn 4: P2 MOVE
  old_pos: (7,2) → new_pos: (6,3)
  Proof: Movement circuit
  Result: commit_2 updated

Turn 5: P1 ATTACK (targets 6,3)
  Defender: P2 at (6,3)
  Proof: Attack circuit (HIT)
  Result: P2 HP: 3 → 2

... game continues until HP reaches 0
```

---

## Data Flow: Client to Contract

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                     │
│                                                         │
│  1. Player Action (move/attack)                        │
│     ↓                                                   │
│  2. Compute New Commitment                             │
│     new_hash = Poseidon(new_x, new_y, salt)            │
│     ↓                                                   │
│  3. Generate ZK Proof (Web Worker)                     │
│     proof = noir.generateProof({                        │
│       private: { x, y, salt, ... },                    │
│       public: { hash, ... }                            │
│     })                                                  │
│     ↓                                                   │
│  4. Submit to Blockchain                               │
│     tx = hub.move(proof, new_hash)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Stellar Transaction
                     ▼
┌─────────────────────────────────────────────────────────┐
│              SOROBAN HUB CONTRACT                       │
│                                                         │
│  1. Receive proof + public inputs                      │
│     ↓                                                   │
│  2. Validate turn order                                │
│     ↓                                                   │
│  3. Call verifier contract                             │
│     valid = verifier.verify(proof, public_inputs)      │
│     ↓                                                   │
│  4. If valid: Update state                             │
│     - Update commitment                                │
│     - Update HP (if attack)                            │
│     - Increment turn counter                           │
│     - Check win condition                              │
│     ↓                                                   │
│  5. Emit event                                         │
│     event: MoveExecuted / AttackResolved               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Verification Request
                     ▼
┌─────────────────────────────────────────────────────────┐
│           SOROBAN VERIFIER CONTRACT                     │
│                                                         │
│  1. Receive proof + public inputs                      │
│     ↓                                                   │
│  2. Parse UltraHonk proof                              │
│     ↓                                                   │
│  3. Execute verification algorithm                     │
│     (Official Noir verifier)                           │
│     ↓                                                   │
│  4. Return bool: valid or invalid                      │
└─────────────────────────────────────────────────────────┘
```

---

## Security: Why ZK is Necessary

### ❌ Without ZK (Naive Approach)

```
Player claims: "I moved from (3,5) to (4,6)"

Problems:
1. Opponent learns your position
2. You could lie about old position
3. No way to verify without revealing location
4. Impossible to play blind game on public blockchain
```

### ✅ With ZK (Our Approach)

```
Player submits: "I moved, here's a proof"

Benefits:
1. Opponent learns nothing about position
2. Proof cryptographically guarantees:
   - Old commitment was valid
   - New commitment is valid
   - Movement distance ≤ 2
   - All coordinates in bounds
3. Contract verifies math, not claims
4. Blind game possible on public blockchain
```

---

## Summary: Circuit Guarantees

### Movement Circuit Guarantees

✅ **Position Privacy:** Coordinates never revealed  
✅ **Commitment Integrity:** Old and new hashes are correct  
✅ **Movement Validity:** Distance ≤ 2, bounds respected  
✅ **Same Player:** Salt stays constant (same unit)  

### Attack Circuit Guarantees

✅ **Position Privacy:** Defender's location stays hidden (unless hit)  
✅ **Commitment Integrity:** Defender's hash is correct  
✅ **Honesty:** Hit/miss result matches actual position  
✅ **Bounds:** All coordinates valid  

### Combined Game Guarantees

✅ **No Cheating:** All actions proven cryptographically  
✅ **Privacy:** Positions hidden until elimination  
✅ **Fairness:** Rules enforced by math, not trust  
✅ **Transparency:** All proofs verifiable on-chain  

---

**The circuits transform invisible game rules into mathematical proofs.**
