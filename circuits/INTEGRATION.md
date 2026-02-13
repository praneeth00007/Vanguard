# Circuit Integration Guide

This guide explains how to integrate the Noir circuits with Soroban smart contracts and the frontend.

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│                 │
│  ┌───────────┐  │
│  │Web Worker │  │  Generates proofs
│  │ noir_js   │  │  client-side
│  └───────────┘  │
└────────┬────────┘
         │ proof + public_inputs
         ▼
┌─────────────────────────────┐
│   Soroban Hub Contract      │
│   (vanguard_hub)            │
│                             │
│  - Stores commitments       │
│  - Manages game state       │
│  - Enforces turn order      │
│  - Calls verifier           │
└────────┬────────────────────┘
         │ verify(proof, inputs)
         ▼
┌─────────────────────────────┐
│  Soroban Verifier Contract  │
│  (vanguard_verifier)        │
│                             │
│  - Wraps Noir UltraHonk     │
│  - Returns bool: valid?     │
└─────────────────────────────┘
```

---

## 1. Frontend: Proof Generation

### Setup

Install dependencies:
```bash
npm install @noir-lang/noir_js @noir-lang/backend_barretenberg
```

### Web Worker Implementation

Create `workers/prover.worker.ts`:

```typescript
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@noir-lang/backend_barretenberg';

// Import compiled circuit
import movementCircuit from '../circuits/movement/target/movement.json';
import attackCircuit from '../circuits/attack/target/attack.json';

interface ProofRequest {
  circuit: 'movement' | 'attack';
  inputs: Record<string, string>;
}

self.onmessage = async (event: MessageEvent<ProofRequest>) => {
  const { circuit, inputs } = event.data;
  
  try {
    let compiledCircuit;
    if (circuit === 'movement') {
      compiledCircuit = movementCircuit;
    } else if (circuit === 'attack') {
      compiledCircuit = attackCircuit;
    } else {
      throw new Error(`Unknown circuit: ${circuit}`);
    }
    
    // Initialize backend and Noir instance
    const backend = new UltraHonkBackend(compiledCircuit.bytecode);
    const noir = new Noir(compiledCircuit, backend);
    
    // Generate proof
    const { proof, publicInputs } = await noir.generateProof(inputs);
    
    self.postMessage({
      success: true,
      proof: Array.from(proof),
      publicInputs: Array.from(publicInputs)
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
```

### Usage in Component

```typescript
import { useEffect, useRef, useState } from 'react';

function GameComponent() {
  const workerRef = useRef<Worker>();
  const [proofStatus, setProofStatus] = useState<string>('idle');
  
  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(
      new URL('../workers/prover.worker.ts', import.meta.url)
    );
    
    workerRef.current.onmessage = (event) => {
      if (event.data.success) {
        const { proof, publicInputs } = event.data;
        // Submit to Soroban hub contract
        submitProofToChain(proof, publicInputs);
      } else {
        console.error('Proof generation failed:', event.data.error);
      }
    };
    
    return () => workerRef.current?.terminate();
  }, []);
  
  const handleMove = async (oldPos, newPos, salt) => {
    setProofStatus('generating');
    
    // Compute commitments using Poseidon (must match circuit)
    const oldHash = await computePoseidon(oldPos.x, oldPos.y, salt);
    const newHash = await computePoseidon(newPos.x, newPos.y, salt);
    
    // Request proof from worker
    workerRef.current?.postMessage({
      circuit: 'movement',
      inputs: {
        old_x: oldPos.x.toString(),
        old_y: oldPos.y.toString(),
        new_x: newPos.x.toString(),
        new_y: newPos.y.toString(),
        salt: salt,
        old_hash: oldHash,
        new_hash: newHash
      }
    });
  };
  
  const submitProofToChain = async (proof: number[], publicInputs: number[]) => {
    // Convert to Soroban-compatible format
    const proofBytes = new Uint8Array(proof);
    const publicInputsBytes = new Uint8Array(publicInputs);
    
    // Call hub contract
    await hubContract.move({
      proof: proofBytes,
      public_inputs: publicInputsBytes
    });
    
    setProofStatus('submitted');
  };
}
```

---

## 2. Poseidon Hash Consistency

**Critical:** The Poseidon hash must be computed identically in:
1. Noir circuits (`poseidon2::Poseidon2::hash`)
2. Frontend (for commitment generation)
3. Soroban contracts (`env.crypto().poseidon_hash`)

### Noir (Circuit)
```noir
use std::hash::poseidon2;
let hash = poseidon2::Poseidon2::hash([x, y, salt], 3);
```

### Soroban (Contract)
```rust
use soroban_sdk::crypto::Poseidon;

let inputs: Vec<BytesN<32>> = vec![
    &env,
    x.into(),
    y.into(),
    salt.clone()
];

let hash = env.crypto().poseidon_hash(&inputs);
```

### Frontend (TypeScript)
```typescript
// Use compatible Poseidon library
// Must match Stellar's native implementation
import { poseidon } from '@your-poseidon-lib';

const hash = poseidon([
  BigInt(x),
  BigInt(y),
  BigInt(salt)
]);
```

**Note:** Ensure all implementations use the same:
- Field modulus
- Round constants
- Number of inputs (3 in our case)

---

## 3. Soroban Verifier Contract

### Contract Structure

```rust
// contracts/vanguard_verifier/src/lib.rs
use soroban_sdk::{contract, contractimpl, Bytes, Vec, Env};
use noir_verifier::UltraHonkVerifier; // From official template

#[contract]
pub struct VanguardVerifier;

#[contractimpl]
impl VanguardVerifier {
    /// Verify a UltraHonk proof
    pub fn verify(
        env: Env,
        proof: Bytes,
        public_inputs: Vec<Bytes>
    ) -> bool {
        // Use official Noir Soroban verifier
        let verifier = UltraHonkVerifier::new(&env);
        verifier.verify(&proof, &public_inputs)
    }
}
```

### Deployment
```bash
stellar contract build
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vanguard_verifier.wasm \
  --network testnet
```

---

## 4. Soroban Hub Contract

### State Management

```rust
use soroban_sdk::{contract, contractimpl, Env, Address, Bytes, Vec};

#[derive(Clone)]
pub struct GameState {
    pub player1: Address,
    pub player2: Address,
    pub p1_hash: Bytes,     // Current position commitment
    pub p2_hash: Bytes,
    pub p1_hp: u32,
    pub p2_hp: u32,
    pub turn: u32,          // Odd = P1, Even = P2
    pub status: GameStatus
}

#[derive(Clone, PartialEq)]
pub enum GameStatus {
    Deploying,
    Active,
    Finished
}
```

### Move Function

```rust
pub fn move_unit(
    env: Env,
    player: Address,
    proof: Bytes,
    new_hash: Bytes
) -> Result<(), GameError> {
    player.require_auth();
    
    let mut state = get_game_state(&env);
    
    // 1. Verify it's player's turn
    let is_p1 = player == state.player1;
    let expected_turn = if is_p1 { state.turn % 2 == 1 } else { state.turn % 2 == 0 };
    if !expected_turn {
        return Err(GameError::NotYourTurn);
    }
    
    // 2. Get current commitment
    let old_hash = if is_p1 { &state.p1_hash } else { &state.p2_hash };
    
    // 3. Prepare public inputs for verifier
    let public_inputs = vec![
        &env,
        old_hash.clone(),
        new_hash.clone()
    ];
    
    // 4. Call verifier contract
    let verifier_id = get_verifier_address(&env);
    let client = VanguardVerifierClient::new(&env, &verifier_id);
    let valid = client.verify(&proof, &public_inputs);
    
    if !valid {
        return Err(GameError::InvalidProof);
    }
    
    // 5. Update state
    if is_p1 {
        state.p1_hash = new_hash;
    } else {
        state.p2_hash = new_hash;
    }
    state.turn += 1;
    
    save_game_state(&env, &state);
    Ok(())
}
```

### Attack Function

```rust
pub fn attack(
    env: Env,
    attacker: Address,
    target_x: u32,
    target_y: u32,
    defender_proof: Bytes,
    hit: bool
) -> Result<AttackResult, GameError> {
    attacker.require_auth();
    
    let mut state = get_game_state(&env);
    
    // 1. Verify turn
    let is_p1_attacking = attacker == state.player1;
    // ... turn validation
    
    // 2. Determine defender
    let defender = if is_p1_attacking { &state.player2 } else { &state.player1 };
    let defender_hash = if is_p1_attacking { &state.p2_hash } else { &state.p1_hash };
    
    // 3. Prepare public inputs
    let public_inputs = vec![
        &env,
        defender_hash.clone(),
        Bytes::from_val(&env, &target_x),
        Bytes::from_val(&env, &target_y),
        Bytes::from_val(&env, &(hit as u8))
    ];
    
    // 4. Verify defender's proof
    let verifier_id = get_verifier_address(&env);
    let client = VanguardVerifierClient::new(&env, &verifier_id);
    let valid = client.verify(&defender_proof, &public_inputs);
    
    if !valid {
        return Err(GameError::InvalidProof);
    }
    
    // 5. Update HP if hit
    if hit {
        if is_p1_attacking {
            state.p2_hp -= 1;
            if state.p2_hp == 0 {
                state.status = GameStatus::Finished;
                // P1 wins
            }
        } else {
            state.p1_hp -= 1;
            if state.p1_hp == 0 {
                state.status = GameStatus::Finished;
                // P2 wins
            }
        }
    }
    
    state.turn += 1;
    save_game_state(&env, &state);
    
    Ok(AttackResult { hit, game_over: state.status == GameStatus::Finished })
}
```

---

## 5. Testing Flow

### End-to-End Test

```typescript
// Test: Complete game flow
describe('Vanguard Game Flow', () => {
  it('should play a complete game', async () => {
    // 1. Deploy both players
    const p1Salt = randomSalt();
    const p2Salt = randomSalt();
    
    const p1Pos = { x: 3, y: 5 };
    const p2Pos = { x: 7, y: 2 };
    
    const p1Hash = await computePoseidon(p1Pos.x, p1Pos.y, p1Salt);
    const p2Hash = await computePoseidon(p2Pos.x, p2Pos.y, p2Salt);
    
    await hub.deploy(player1, p1Hash);
    await hub.deploy(player2, p2Hash);
    
    // 2. P1 moves (3,5) -> (4,6)
    const newP1Pos = { x: 4, y: 6 };
    const newP1Hash = await computePoseidon(newP1Pos.x, newP1Pos.y, p1Salt);
    
    const moveProof = await generateProof('movement', {
      old_x: p1Pos.x,
      old_y: p1Pos.y,
      new_x: newP1Pos.x,
      new_y: newP1Pos.y,
      salt: p1Salt,
      old_hash: p1Hash,
      new_hash: newP1Hash
    });
    
    await hub.move(player1, moveProof.proof, newP1Hash);
    
    // 3. P2 attacks (4,6)
    const attackProof = await generateProof('attack', {
      x: newP1Pos.x,
      y: newP1Pos.y,
      salt: p1Salt,
      commitment: newP1Hash,
      target_x: 4,
      target_y: 6,
      hit: true
    });
    
    const result = await hub.attack(
      player2,
      4,
      6,
      attackProof.proof,
      true
    );
    
    expect(result.hit).toBe(true);
    // P1 HP reduced from 3 to 2
  });
});
```

---

## 6. Deployment Checklist

### Prerequisites
- [ ] Noir v1.x installed
- [ ] Stellar CLI installed
- [ ] Node.js 18+ with Bun
- [ ] Testnet account with XLM

### Build Steps

```bash
# 1. Build circuits
cd circuits/movement && nargo build
cd ../attack && nargo build
cd ../deployment && nargo build

# 2. Export circuit artifacts
nargo export

# 3. Build contracts
cd ../../contracts
stellar contract build

# 4. Deploy verifier
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vanguard_verifier.wasm \
  --network testnet

# 5. Deploy hub (with verifier address)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vanguard_hub.wasm \
  --network testnet

# 6. Generate TypeScript bindings
stellar contract bindings typescript \
  --contract-id <hub_contract_id> \
  --output-dir ./bindings

# 7. Install frontend dependencies
cd ../frontend
npm install

# 8. Copy circuit artifacts to frontend
cp ../circuits/movement/target/movement.json ./public/circuits/
cp ../circuits/attack/target/attack.json ./public/circuits/

# 9. Run frontend
npm run dev
```

---

## 7. Security Considerations

### Replay Protection
```rust
// Store used proof hashes
const USED_PROOFS: Map<Bytes, ()> = Map::new();

pub fn move_unit(env: Env, proof: Bytes, ...) {
    let proof_hash = env.crypto().sha256(&proof);
    
    if USED_PROOFS.contains_key(&proof_hash) {
        return Err(GameError::ProofReused);
    }
    
    // Verify and execute move
    // ...
    
    USED_PROOFS.set(&proof_hash, &());
}
```

### Turn Enforcement
```rust
// Strict turn-based logic
pub fn validate_turn(state: &GameState, player: &Address) -> Result<(), GameError> {
    let is_p1 = player == &state.player1;
    let is_p1_turn = state.turn % 2 == 1;
    
    if is_p1 != is_p1_turn {
        return Err(GameError::NotYourTurn);
    }
    
    Ok(())
}
```

### Commitment Uniqueness
```rust
// Ensure same commitment not used twice in same game
pub fn deploy(env: Env, player: Address, commitment: Bytes) {
    // Check commitment not already used
    if commitment == state.p1_hash || commitment == state.p2_hash {
        panic!("Commitment already used");
    }
}
```

---

## Summary

This integration connects:
1. **Noir circuits** → Generate proofs client-side
2. **Web Worker** → Isolate proof generation (CPU-intensive)
3. **Soroban verifier** → Verify proofs on-chain (official template)
4. **Soroban hub** → Manage game state + enforce rules
5. **Frontend** → User interaction + proof coordination

All components use **consistent Poseidon hashing** to ensure commitments match across the stack.
