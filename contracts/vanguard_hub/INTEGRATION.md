# Vanguard Hub - Integration Guide

This guide explains how to integrate the vanguard_hub contract with the vanguard_verifier contract and the frontend.

## Architecture Overview

```
Frontend (Next.js + noir_js)
    │
    ├─► Web Worker generates proofs
    │
    ├─► Submits to hub contract
    │       │
    │       ├─► Validates game state
    │       ├─► Enforces turn order
    │       ├─► Prevents replay attacks
    │       │
    │       └─► Calls verifier contract
    │               │
    │               └─► Validates UltraHonk proofs
```

## Phase 1: Deploy Verifier Contract

First, deploy the `vanguard_verifier` contract to your network.

```bash
cd contracts/vanguard_verifier

# Build
make build

# Optimize
make optimize

# Deploy (adjust network as needed)
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vanguard_verifier.optimized.wasm \
  --network standalone
```

**Save the contract ID** - you'll need it for the hub contract.

## Phase 2: Update Hub Contract with Verifier Address

### Option A: Hardcode Verifier Address

For simplicity, you can hardcode the verifier address in the hub contract:

```rust
// In src/lib.rs

const VERIFIER_CONTRACT_ID: &str = "YOUR_VERIFIER_CONTRACT_ID_HERE";

// In move_unit() function:
let verifier_address = Address::from_contract_id(
    &env,
    ContractId::from_str(&env, VERIFIER_CONTRACT_ID).unwrap()
);

let verify_result: bool = env.invoke_contract(
    &verifier_address,
    &Symbol::new(&env, "verify_ultrahonk"),
    vec![&env, proof, public_inputs]
).unwrap();

if !verify_result {
    panic!("Invalid movement proof");
}
```

### Option B: Pass Verifier Address in Constructor

Add a `set_verifier()` function to configure the verifier address:

```rust
/// Set the verifier contract address.
pub fn set_verifier(env: Env, admin: Address, verifier_address: Address) {
    // Verify admin is the contract creator
    // Store verifier address in storage
    env.storage().instance().set(&DataKey::VerifierAddress, &verifier_address);
}
```

## Phase 3: Deploy Hub Contract

```bash
cd contracts/vanguard_hub

# Build
make build

# Optimize
make optimize

# Deploy
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vanguard_hub.optimized.wasm \
  --network standalone
```

**Save the contract ID** for frontend integration.

## Phase 4: Initialize Game

Once deployed, initialize a new game:

```bash
# Get your addresses
P1_ADDRESS=G...
P2_ADDRESS=G...
HUB_CONTRACT_ID=C...

# Initialize game
soroban contract invoke \
  --id $HUB_CONTRACT_ID \
  --network standalone \
  -- \
  initialize_game \
  --p1 $P1_ADDRESS \
  --p2 $P2_ADDRESS
```

## Phase 5: Frontend Integration

### Generate TypeScript Bindings

```bash
cd contracts/vanguard_hub
make bindings
```

This generates `bindings/vanguard_hub.ts` with type-safe interfaces.

### Frontend Implementation

```typescript
import { Contract, SorobanRpc, TransactionBuilder } from '@stellar/stellar-sdk';
import { generateMovementProof, generateAttackProof } from './workers/prover';

const rpc = new SorobanRpc.Server('https://rpc.stellar.org');
const hubContractId = 'YOUR_HUB_CONTRACT_ID';
const hub = new Contract(hubContractId);

// Initialize game
async function initializeGame(p1Address: string, p2Address: string) {
  const account = await rpc.getAccount(p1Address);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: 'Public Global Stellar Network ;)'
  })
    .addOperation(
      hub.call(
        'initialize_game',
        new Address(p1Address).toScVal(),
        new Address(p2Address).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  tx.sign(p1Keypair);
  const result = await rpc.sendTransaction(tx);
  return result.hash;
}

// Commit position
async function commitPosition(playerAddress: string, commitment: Uint8Array) {
  const account = await rpc.getAccount(playerAddress);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: 'Public Global Stellar Network ;)'
  })
    .addOperation(
      hub.call(
        'commit_position',
        new Address(playerAddress).toScVal(),
        ScVal.bytes(commitment)
      )
    )
    .setTimeout(30)
    .build();

  tx.sign(playerKeypair);
  await rpc.sendTransaction(tx);
}

// Move unit with ZK proof
async function moveUnit(
  playerAddress: string,
  oldX: number,
  oldY: number,
  newX: number,
  newY: number,
  salt: Uint8Array,
  turnCounter: number
) {
  // Compute commitments
  const oldHash = await computePoseidonHash(oldX, oldY, salt);
  const newHash = await computePoseidonHash(newX, newY, salt);

  // Generate ZK proof
  const { proof, publicInputs } = await generateMovementProof({
    oldX,
    oldY,
    newX,
    newY,
    salt,
    oldHash,
    newHash,
    turnCounter
  });

  // Submit to hub contract
  const account = await rpc.getAccount(playerAddress);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: 'Public Global Stellar Network ;)'
  })
    .addOperation(
      hub.call(
        'move_unit',
        new Address(playerAddress).toScVal(),
        ScVal.bytes(proof),
        new ScValVec(
          publicInputs.map(input => ScVal.bytes(input))
        )
      )
    )
    .setTimeout(30)
    .build();

  tx.sign(playerKeypair);
  await rpc.sendTransaction(tx);
}

// Attack with ZK proof
async function attack(
  attackerAddress: string,
  defenderAddress: string,
  targetX: number,
  targetY: number,
  turnCounter: number
) {
  // Get defender's commitment
  const commitment = await getCommitment(defenderAddress);

  // Defender generates proof (this would be done by defender)
  const { proof, publicInputs, hit } = await generateAttackProof({
    commitment,
    targetX,
    targetY,
    turnCounter
  });

  // Submit to hub contract
  const account = await rpc.getAccount(attackerAddress);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: 'Public Global Stellar Network ;)'
  })
    .addOperation(
      hub.call(
        'attack',
        new Address(attackerAddress).toScVal(),
        ScVal.bytes(proof),
        new ScValVec(
          publicInputs.map(input => ScVal.bytes(input))
        )
      )
    )
    .setTimeout(30)
    .build();

  tx.sign(attackerKeypair);
  await rpc.sendTransaction(tx);

  return hit;
}
```

## Phase 6: Web Worker Setup

Create `workers/prover.worker.ts`:

```typescript
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@noir-lang/backend_barretenberg';

// Import compiled circuits
import movementCircuit from '../../circuits/movement/target/movement.json';
import attackCircuit from '../../circuits/attack/target/attack.json';

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
      publicInputs: publicInputs.map((input: any) => Array.from(input))
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
```

## Phase 7: Poseidon Hash Helper

Create a helper function to compute Poseidon hashes that match the circuit:

```typescript
import { poseidon2 } from 'poseidon2-base'; // or your preferred library

export async function computePoseidonHash(
  x: number,
  y: number,
  salt: Uint8Array
): Promise<Uint8Array> {
  // Convert numbers to field elements (32 bytes each)
  const xBytes = numToBytes(x, 32);
  const yBytes = numToBytes(y, 32);

  // Compute Poseidon hash
  const hash = await poseidon2.hash([xBytes, yBytes, salt]);

  return hash;
}

function numToBytes(num: number, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = (num >> (8 * i)) & 0xff;
  }
  return bytes;
}
```

## Phase 8: Event Monitoring

Listen for game events from the hub contract:

```typescript
async function listenForEvents() {
  const events = await rpc.getEvents({
    eventTypes: [
      'MoveEvent',
      'AttackEvent',
      'GameOverEvent'
    ]
  });

  for (const event of events.events) {
    if (event.type === 'MoveEvent') {
      const { player, turn } = parseMoveEvent(event);
      console.log(`Player ${player} moved on turn ${turn}`);
    } else if (event.type === 'AttackEvent') {
      const { attacker, hit, turn } = parseAttackEvent(event);
      console.log(`Player ${attacker} ${hit ? 'HIT' : 'MISS'} on turn ${turn}`);
    } else if (event.type === 'GameOverEvent') {
      const { winner } = parseGameOverEvent(event);
      console.log(`Game over! Player ${winner} wins!`);
    }
  }
}
```

## Testing the Integration

### Test 1: Initialize and Commit

```bash
# Initialize game
soroban contract invoke \
  --id $HUB_CONTRACT_ID \
  --network standalone \
  -- \
  initialize_game \
  --p1 $P1_ADDRESS \
  --p2 $P2_ADDRESS

# Player 1 commits position
COMMITMENT_1=$(generate-commitment)
soroban contract invoke \
  --id $HUB_CONTRACT_ID \
  --network standalone \
  -- \
  commit_position \
  --player $P1_ADDRESS \
  --commitment $COMMITMENT_1

# Player 2 commits position
COMMITMENT_2=$(generate-commitment)
soroban contract invoke \
  --id $HUB_CONTRACT_ID \
  --network standalone \
  -- \
  commit_position \
  --player $P2_ADDRESS \
  --commitment $COMMITMENT_2
```

### Test 2: Move Unit

```bash
# Generate movement proof (frontend)
PROOF=$(nargo prove)
PUBLIC_INPUTS=$(get-public-inputs)

# Submit move
soroban contract invoke \
  --id $HUB_CONTRACT_ID \
  --network standalone \
  -- \
  move_unit \
  --player $P1_ADDRESS \
  --proof $PROOF \
  --public_inputs $PUBLIC_INPUTS
```

### Test 3: Attack

```bash
# Generate attack proof (defender)
PROOF=$(nargo prove)
PUBLIC_INPUTS=$(get-public-inputs)

# Submit attack (attacker submits)
soroban contract invoke \
  --id $HUB_CONTRACT_ID \
  --network standalone \
  -- \
  attack \
  --attacker $P1_ADDRESS \
  --proof $PROOF \
  --public_inputs $PUBLIC_INPUTS
```

## Troubleshooting

### "Invalid turn counter" Error

This means the proof was generated with an old turn counter. Regenerate the proof with the current turn counter:

```typescript
const currentTurnCounter = await getTurnCounter();
const { proof, publicInputs } = await generateMovementProof({
  // ... other inputs
  turnCounter: currentTurnCounter
});
```

### "Old hash does not match stored commitment"

The proof includes an old_hash that doesn't match what's stored on-chain. Ensure:
1. The commitment was submitted before the move
2. The proof uses the correct stored commitment
3. The commitment was computed with the same (x, y, salt) as the proof

### "Commitment does not match defender's stored commitment"

During an attack, the defender's commitment must match the stored value. This could happen if:
1. Defender hasn't committed position yet
2. Wrong defender address used
3. Defender moved after the attack was initiated

### "Not player's turn"

Turn order is strictly enforced. Check whose turn it is:

```bash
soroban contract invoke \
  --id $HUB_CONTRACT_ID \
  --network standalone \
  -- \
  get_turn
```

## Security Checklist

- [ ] Verifier contract deployed and integrated
- [ ] Turn counter properly incremented on every move/attack
- [ ] Commitments validated before state changes
- [ ] Proof verification called on all state changes
- [ ] Game ends when HP reaches 0
- [ ] Events emitted for all state changes
- [ ] Frontend validates turn order before submitting
- [ ] Proof generation happens in Web Worker
- [ ] Poseidon hash matches circuit implementation

## Next Steps

1. Update hub contract with verifier integration
2. Deploy both contracts to testnet
3. Implement Web Worker proof generation
4. Build Next.js frontend
5. End-to-end testing
6. Deploy to mainnet

## References

- [Vanguard Verifier Contract](../vanguard_verifier/README.md)
- [Noir Circuits](../../circuits/README.md)
- [Stellar Soroban SDK](https://soroban.stellar.org/docs)
- [Stellar Game Studio](https://github.com/Junman140/Stellar-Game-Studio)
