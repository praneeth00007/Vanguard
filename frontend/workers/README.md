# ZK Proof Generation Web Worker

This directory contains the Web Worker implementation for generating Noir zero-knowledge proofs for Vanguard Blindside.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                    │
│                                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Game Component (e.g., GameBoard)        │   │
│  │  - Collects user input (move, attack, scan)      │   │
│  │  - Manages local game state                      │   │
│  └──────────────┬────────────────────────────────────┘   │
│                 │                                          │
│  ┌──────────────▼────────────────────────────────────┐   │
│  │         useProofWorker Hook                       │   │
│  │  - Manages worker lifecycle                       │   │
│  │  - Provides generateProof() function              │   │
│  │  - Handles success/error states                   │   │
│  └──────────────┬────────────────────────────────────┘   │
│                 │                                          │
└─────────────────┼──────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Web Worker (proofWorker.ts)                │
│  - Runs in separate thread (non-blocking UI)           │
│  - Loads compiled circuit JSON                          │
│  - Uses noir_js + UltraHonkBackend                      │
│  - Generates ZK proofs                                  │
│  - Returns proof + public inputs                       │
└─────────────────────────────────────────────────────────┘
                  │
                  │ proof + public_inputs
                  ▼
┌─────────────────────────────────────────────────────────┐
│                 Soroban Contract                         │
│  - Verifies proof using vanguard_verifier               │
│  - Validates public inputs (turn_counter, hashes)      │
│  - Updates on-chain game state                         │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. proofWorker.ts

The main Web Worker that:
- Loads compiled Noir circuit JSON files
- Uses `@noir-lang/noir_js` and `@noir-lang/backend_barretenberg`
- Generates proofs for movement, attack, and scan actions
- Returns proofs and public inputs to the main thread

**Key features:**
- Runs in a separate thread (non-blocking UI)
- Handles all three circuit types
- Validates inputs before proof generation
- Includes local proof verification (optional)
- Normalizes inputs to required string format

### 2. proofWorkerHelper.ts

React hook and helper functions that:
- `useProofWorker()`: React hook for managing proof generation
- `createMovementInput()`: Helper to create movement proof inputs
- `createAttackInput()`: Helper to create attack proof inputs
- `createScanInput()`: Helper to create scan proof inputs

**Key features:**
- Manages worker lifecycle
- Provides type-safe proof generation
- Tracks generation state (idle, generating, success, error)
- Simplifies input creation with helper functions

### 3. ProofGenerationExample.tsx

Example component demonstrating:
- How to use the `useProofWorker` hook
- How to create proof inputs
- How to handle proof generation states
- How to submit proofs to the blockchain (placeholder)

## Usage

### Basic Setup

```typescript
import { useProofWorker } from "@/lib/proofWorkerHelper";

function GameComponent() {
  const { generateProof, result, isGenerating, reset } = useProofWorker();

  // ... rest of component
}
```

### Generating a Movement Proof

```typescript
import { createMovementInput } from "@/lib/proofWorkerHelper";

const handleMove = async () => {
  try {
    // Private inputs (never sent to chain)
    const oldX = 3;
    const oldY = 5;
    const newX = 4;
    const newY = 6;
    const salt = "0x" + "a".repeat(64); // 32-byte hex string

    // Compute Poseidon commitments (use compatible library)
    const oldHash = await computePoseidonHash(oldX, oldY, salt);
    const newHash = await computePoseidonHash(newX, newY, salt);

    // Vehicle type: 0 = Cycle, 1 = Scout, 2 = Heavy
    const vehicleType = 0;
    const turnCounter = currentTurn + 1;

    // Create input object
    const input = createMovementInput({
      oldX,
      oldY,
      newX,
      newY,
      salt,
      oldHash,
      newHash,
      vehicleType,
      turnCounter,
    });

    // Generate proof
    const { proof, publicInputs } = await generateProof("movement", input);

    // Submit to blockchain
    await hubContract.move({
      proof,
      public_inputs: publicInputs,
      new_hash: newHash,
    });
  } catch (error) {
    console.error("Move proof failed:", error);
  }
};
```

### Generating an Attack Proof

```typescript
import { createAttackInput } from "@/lib/proofWorkerHelper";

const handleAttack = async (targetX: number, targetY: number) => {
  try {
    // Attacker's private inputs
    const attackerX = myPosition.x;
    const attackerY = myPosition.y;
    const attackerSalt = mySalt;
    const attackerHash = myCommitment;

    // Defender's private inputs (known to defender only)
    const defenderX = opponentPosition.x;
    const defenderY = opponentPosition.y;
    const defenderSalt = opponentSalt;
    const defenderHash = opponentCommitment;

    // Determine if this is a hit
    const claimedHit = defenderX === targetX && defenderY === targetY;

    const vehicleType = 1; // Scout
    const turnCounter = currentTurn + 1;

    const input = createAttackInput({
      attackerX,
      attackerY,
      attackerSalt,
      attackerHash,
      defenderX,
      defenderY,
      defenderSalt,
      defenderHash,
      targetX,
      targetY,
      vehicleType,
      turnCounter,
      claimedHit,
    });

    const { proof, publicInputs } = await generateProof("attack", input);

    // Submit to blockchain
    await hubContract.attack({
      proof,
      public_inputs: publicInputs,
      claimed_hit: claimedHit,
    });
  } catch (error) {
    console.error("Attack proof failed:", error);
  }
};
```

### Generating a Scan Proof

```typescript
import { createScanInput } from "@/lib/proofWorkerHelper";

const handleScan = async (scanX: number, scanY: number) => {
  try {
    // Scanner's private inputs
    const scannerX = myPosition.x;
    const scannerY = myPosition.y;
    const scannerSalt = mySalt;
    const scannerHash = myCommitment;

    // Defender's private inputs
    const defenderX = opponentPosition.x;
    const defenderY = opponentPosition.y;
    const defenderSalt = opponentSalt;
    const defenderHash = opponentCommitment;

    // Check if defender is in the 2x2 scan area
    const inX = defenderX >= scanX && defenderX <= scanX + 1;
    const inY = defenderY >= scanY && defenderY <= scanY + 1;
    const claimedScanHit = inX && inY;

    const vehicleType = 0; // Only Cycle can scan
    const turnCounter = currentTurn + 1;

    const input = createScanInput({
      scannerX,
      scannerY,
      scannerSalt,
      scannerHash,
      defenderX,
      defenderY,
      defenderSalt,
      defenderHash,
      scanX,
      scanY,
      vehicleType,
      turnCounter,
      claimedScanHit,
    });

    const { proof, publicInputs } = await generateProof("scan", input);

    // Submit to blockchain
    await hubContract.scan({
      proof,
      public_inputs: publicInputs,
      scan_hit: claimedScanHit,
    });
  } catch (error) {
    console.error("Scan proof failed:", error);
  }
};
```

## Input Types

### Movement Input

| Parameter | Type | Description | Public/Private |
|-----------|------|-------------|----------------|
| `old_x` | number | Old X coordinate | Private |
| `old_y` | number | Old Y coordinate | Private |
| `new_x` | number | New X coordinate | Private |
| `new_y` | number | New Y coordinate | Private |
| `salt` | string | Random salt (32 bytes) | Private |
| `old_hash` | string | Poseidon(old_x, old_y, salt) | Public |
| `new_hash` | string | Poseidon(new_x, new_y, salt) | Public |
| `vehicle_type` | number | 0=Cycle, 1=Scout, 2=Heavy | Public |
| `action_type` | number | 0 (move) | Public |
| `turn_counter` | number | Current turn number | Public |

### Attack Input

| Parameter | Type | Description | Public/Private |
|-----------|------|-------------|----------------|
| `attacker_x` | number | Attacker X coordinate | Private |
| `attacker_y` | number | Attacker Y coordinate | Private |
| `attacker_salt` | string | Attacker's salt | Private |
| `attacker_hash` | string | Attacker's commitment | Public |
| `defender_x` | number | Defender X coordinate | Private |
| `defender_y` | number | Defender Y coordinate | Private |
| `defender_salt` | string | Defender's salt | Private |
| `defender_hash` | string | Defender's commitment | Public |
| `target_x` | number | Target X coordinate | Public |
| `target_y` | number | Target Y coordinate | Public |
| `vehicle_type` | number | 0=Cycle, 1=Scout, 2=Heavy | Public |
| `action_type` | number | 1 (attack) | Public |
| `turn_counter` | number | Current turn number | Public |
| `claimed_hit` | boolean | Whether target was hit | Public |

### Scan Input

| Parameter | Type | Description | Public/Private |
|-----------|------|-------------|----------------|
| `scanner_x` | number | Scanner X coordinate | Private |
| `scanner_y` | number | Scanner Y coordinate | Private |
| `scanner_salt` | string | Scanner's salt | Private |
| `scanner_hash` | string | Scanner's commitment | Public |
| `defender_x` | number | Defender X coordinate | Private |
| `defender_y` | number | Defender Y coordinate | Private |
| `defender_salt` | string | Defender's salt | Private |
| `defender_hash` | string | Defender's commitment | Public |
| `scan_x` | number | Scan area top-left X | Public |
| `scan_y` | number | Scan area top-left Y | Public |
| `vehicle_type` | number | 0=Cycle only | Public |
| `action_type` | number | 2 (scan) | Public |
| `turn_counter` | number | Current turn number | Public |
| `claimed_scan_hit` | boolean | Whether defender detected | Public |

## Security Features

### 1. Salt Privacy
- Salt is a **private input** (witness) to the circuit
- Salt is **never** sent to the blockchain
- Only the commitment `Poseidon(x, y, salt)` is stored on-chain
- Without the salt, it's computationally infeasible to derive coordinates from the commitment

### 2. Coordinate Privacy
- Coordinates (x, y) are **private inputs** (witnesses)
- Coordinates are **never** sent to the blockchain
- The ZK proof proves knowledge of valid coordinates without revealing them

### 3. Replay Protection
- `turn_counter` is a **public input** to all circuits
- Old proofs cannot be reused because the turn_counter will be wrong
- The contract validates that the turn_counter matches the expected turn

### 4. Non-Blocking UI
- Proof generation happens in a Web Worker
- Main thread remains responsive during proof generation
- Users can continue interacting with the UI

### 5. Local Verification
- The worker optionally verifies proofs before returning them
- This catches errors early before submitting to blockchain
- Can be disabled in production for speed

## Circuit Compilation

Circuits must be compiled with Nargo and the JSON files placed in `public/circuits/`:

```bash
# Compile all circuits
cd circuits/movement && nargo compile
cd ../attack && nargo compile
cd ../scan && nargo compile

# Copy to frontend
cp movement/target/movement.json ../../frontend/public/circuits/
cp attack/target/attack.json ../../frontend/public/circuits/
cp scan/target/scan.json ../../frontend/public/circuits/
```

## Dependencies

Required packages:
```json
{
  "@noir-lang/noir_js": "^1.0.0",
  "@noir-lang/backend_barretenberg": "^1.0.0"
}
```

## Troubleshooting

### Worker fails to initialize
- Ensure the worker file path is correct
- Check that the module type is set in `tsconfig.json`
- Verify browser supports Web Workers

### Circuit not found
- Ensure circuit JSON files are in `public/circuits/`
- Check that file names match: `movement.json`, `attack.json`, `scan.json`
- Verify the files are being served correctly

### Proof generation fails
- Check that all required inputs are provided
- Verify inputs are in the correct format (strings for noir_js)
- Check the browser console for detailed error messages
- Ensure the circuit was compiled successfully

### Proof verification fails on-chain
- Verify the public inputs match what was submitted
- Check that turn_counter is correct
- Ensure the contract has the correct verifier address

## Performance

- **Movement proof**: ~2-5 seconds (depending on hardware)
- **Attack proof**: ~3-6 seconds
- **Scan proof**: ~3-6 seconds

Proof generation time can be optimized by:
- Using WASM instead of pure JS (already done by noir_js)
- Reducing circuit complexity
- Using hardware acceleration if available
