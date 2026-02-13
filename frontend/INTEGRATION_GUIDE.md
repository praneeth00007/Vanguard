# Proof Generation Integration Guide

This guide explains how to integrate ZK proof generation into your Vanguard Blindside game components.

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install @noir-lang/noir_js @noir-lang/backend_barretenberg
```

### 2. Ensure Circuit Files Are Available

Make sure the compiled circuit JSON files are in `public/circuits/`:
- `movement.json`
- `attack.json`
- `scan.json`

If they're not there, compile them:

```bash
cd circuits/movement && nargo compile
cd ../attack && nargo compile
cd ../scan && nargo compile

cp movement/target/movement.json ../../frontend/public/circuits/
cp attack/target/attack.json ../../frontend/public/circuits/
cp scan/target/scan.json ../../frontend/public/circuits/
```

### 3. Import and Use the Hook

```typescript
import { useProofWorker } from "@/lib/proofWorkerHelper";

function GameBoard() {
  const { generateProof, isGenerating, result } = useProofWorker();

  // ... your component logic
}
```

## Game Component Integration

### Movement Action

```typescript
import { useProofWorker, createMovementInput } from "@/lib/proofWorkerHelper";

function GameBoard() {
  const { generateProof, isGenerating } = useProofWorker();
  const [myPosition, setMyPosition] = useState({ x: 3, y: 5 });
  const [mySalt] = useState(() => generateRandomSalt());
  const [myCommitment, setMyCommitment] = useState<Hash>(initialCommitment);
  const [turnCounter, setTurnCounter] = useState(1);

  const handleMove = async (newX: number, newY: number) => {
    try {
      // Calculate old and new commitments
      const oldHash = myCommitment;
      const newHash = await computePoseidonHash(newX, newY, mySalt);

      // Create input object
      const input = createMovementInput({
        oldX: myPosition.x,
        oldY: myPosition.y,
        newX,
        newY,
        salt: mySalt,
        oldHash,
        newHash,
        vehicleType: 0, // Cycle
        turnCounter: turnCounter + 1,
      });

      // Generate proof (this happens in worker, UI stays responsive)
      const { proof, publicInputs } = await generateProof("movement", input);

      // Submit to Soroban contract
      const tx = await hubContract.move({
        proof,
        public_inputs: publicInputs,
        new_hash: newHash,
      });

      // Wait for transaction confirmation
      await tx.wait();

      // Update local state
      setMyPosition({ x: newX, y: newY });
      setMyCommitment(newHash);
      setTurnCounter((prev) => prev + 1);

    } catch (error) {
      console.error("Move failed:", error);
      // Show error to user
      showError("Failed to execute move");
    }
  };

  return (
    <div>
      <Grid>
        {cells.map((cell) => (
          <Cell
            key={`${cell.x}-${cell.y}`}
            onClick={() => handleMove(cell.x, cell.y)}
            disabled={isGenerating} // Disable while generating proof
          >
            {cell.x === myPosition.x && cell.y === myPosition.y ? "🚴" : null}
          </Cell>
        ))}
      </Grid>
      {isGenerating && <div>Generating proof...</div>}
    </div>
  );
}
```

### Attack Action

```typescript
import { useProofWorker, createAttackInput } from "@/lib/proofWorkerHelper";

function GameBoard() {
  const { generateProof, isGenerating } = useProofWorker();
  const [myPosition, setMyPosition] = useState({ x: 3, y: 5 });
  const [mySalt] = useState(() => generateRandomSalt());
  const [myCommitment] = useState<Hash>(initialCommitment);
  const [opponentCommitment] = useState<Hash>(opponentInitialCommitment);
  const [turnCounter, setTurnCounter] = useState(1);

  const handleAttack = async (targetX: number, targetY: number) => {
    try {
      // Check if this is a hit (defender knows their position)
      // This is computed by the defender and passed to the attacker
      const isHit = await defenderProvesHit(targetX, targetY);

      // Attacker generates proof using defender's private inputs
      // In practice, this would be done by the defender
      const input = createAttackInput({
        attackerX: myPosition.x,
        attackerY: myPosition.y,
        attackerSalt: mySalt,
        attackerHash: myCommitment,
        defenderX: defenderPosition.x, // From defender
        defenderY: defenderPosition.y, // From defender
        defenderSalt: defenderSalt, // From defender
        defenderHash: opponentCommitment,
        targetX,
        targetY,
        vehicleType: 1, // Scout
        turnCounter: turnCounter + 1,
        claimedHit: isHit,
      });

      const { proof, publicInputs } = await generateProof("attack", input);

      const tx = await hubContract.attack({
        proof,
        public_inputs: publicInputs,
        claimed_hit: isHit,
      });

      await tx.wait();
      setTurnCounter((prev) => prev + 1);

    } catch (error) {
      console.error("Attack failed:", error);
      showError("Failed to execute attack");
    }
  };

  return (
    <div>
      <Grid>
        {cells.map((cell) => (
          <Cell
            key={`${cell.x}-${cell.y}`}
            onClick={() => handleAttack(cell.x, cell.y)}
            disabled={isGenerating}
          >
            {cell.marked ? "❌" : null}
          </Cell>
        ))}
      </Grid>
    </div>
  );
}
```

### Scan Action (Cycle Only)

```typescript
import { useProofWorker, createScanInput } from "@/lib/proofWorkerHelper";

function GameBoard() {
  const { generateProof, isGenerating } = useProofWorker();
  const [myPosition] = useState({ x: 3, y: 5 });
  const [mySalt] = useState(() => generateRandomSalt());
  const [myCommitment] = useState<Hash>(initialCommitment);
  const [vehicleType] = useState(0); // Cycle

  const handleScan = async (scanX: number, scanY: number) => {
    try {
      // Only Cycle can scan
      if (vehicleType !== 0) {
        showError("Only Cycle can scan");
        return;
      }

      // Defender checks if they're in the 2x2 area
      const inScanArea =
        defenderPosition.x >= scanX &&
        defenderPosition.x <= scanX + 1 &&
        defenderPosition.y >= scanY &&
        defenderPosition.y <= scanY + 1;

      const input = createScanInput({
        scannerX: myPosition.x,
        scannerY: myPosition.y,
        scannerSalt: mySalt,
        scannerHash: myCommitment,
        defenderX: defenderPosition.x,
        defenderY: defenderPosition.y,
        defenderSalt: defenderSalt,
        defenderHash: opponentCommitment,
        scanX,
        scanY,
        vehicleType: 0, // Must be 0
        turnCounter: turnCounter + 1,
        claimedScanHit: inScanArea,
      });

      const { proof, publicInputs } = await generateProof("scan", input);

      const tx = await hubContract.scan({
        proof,
        public_inputs: publicInputs,
        scan_hit: inScanArea,
      });

      await tx.wait();

      // Show result to player
      if (inScanArea) {
        showSuccess("Enemy detected in scan area!");
      } else {
        showInfo("No enemy detected in scan area");
      }

    } catch (error) {
      console.error("Scan failed:", error);
      showError("Failed to execute scan");
    }
  };

  return (
    <div>
      <Grid>
        {cells.map((cell) => (
          <Cell
            key={`${cell.x}-${cell.y}`}
            onRightClick={() => handleScan(cell.x, cell.y)}
            disabled={isGenerating}
          >
            {/* ... */}
          </Cell>
        ))}
      </Grid>
    </div>
  );
}
```

## Managing Game State

### Storing Private Information

```typescript
function GameBoard() {
  // Private - never sent to chain
  const [myPosition] = useState({ x: 3, y: 5 });
  const [mySalt] = useState(() => generateRandomSalt());

  // Public - only commitments are sent to chain
  const [myCommitment] = useState<Hash>(initialCommitment);

  // Turn counter - used for replay protection
  const [turnCounter, setTurnCounter] = useState(1);

  return (
    // ...
  );
}
```

### Computing Commitments

```typescript
import { poseidonHash } from "@/lib/crypto"; // Your Poseidon implementation

function GameBoard() {
  const computeCommitment = async (x: number, y: number, salt: string): Promise<Hash> => {
    // Must match the circuit's Poseidon implementation
    return await poseidonHash([x, y, salt]);
  };

  // ...
}
```

### Handling Proof Generation State

```typescript
function GameBoard() {
  const { generateProof, isGenerating, result } = useProofWorker();

  useEffect(() => {
    if (result.status === "success") {
      // Proof generated successfully
      showSuccess("Proof generated!");
    } else if (result.status === "error") {
      // Proof generation failed
      showError(result.error);
    }
  }, [result]);

  return (
    <div>
      <Button onClick={handleMove} disabled={isGenerating}>
        {isGenerating ? "Generating proof..." : "Move"}
      </Button>

      {isGenerating && (
        <div className="loading-spinner">
          <span>Generating ZK proof (this may take a few seconds)...</span>
        </div>
      )}

      {result.status === "error" && (
        <div className="error-message">
          {result.error}
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Disable UI During Proof Generation

```typescript
<button onClick={handleMove} disabled={isGenerating}>
  {isGenerating ? "Generating proof..." : "Move"}
</button>
```

### 2. Show Loading Indicators

```typescript
{isGenerating && (
  <div className="proof-generation-indicator">
    <Spinner />
    <span>Generating zero-knowledge proof...</span>
    <small>This happens in a worker - UI stays responsive</small>
  </div>
)}
```

### 3. Handle Errors Gracefully

```typescript
try {
  const { proof, publicInputs } = await generateProof("movement", input);
  // Submit to chain
} catch (error) {
  console.error("Proof generation failed:", error);
  // Show user-friendly error message
  alert("Failed to generate proof. Please try again.");
}
```

### 4. Update State After Successful Transaction

```typescript
const handleMove = async (newX: number, newY: number) => {
  // ... generate proof
  const tx = await hubContract.move({ ... });
  await tx.wait(); // Wait for confirmation

  // Only update local state after chain confirms
  setMyPosition({ x: newX, y: newY });
  setMyCommitment(newHash);
  setTurnCounter((prev) => prev + 1);
};
```

### 5. Keep Salt Secure

```typescript
// ✅ Good: Salt is stored locally, never sent to chain
const [mySalt] = useState(() => generateRandomSalt());

// ❌ Bad: Never log or expose the salt
console.log("My salt:", mySalt); // DON'T DO THIS

// ✅ Good: Only expose the commitment
useEffect(() => {
  // Commitment is safe to log and display
  console.log("My commitment:", myCommitment);
}, [myCommitment]);
```

## Common Patterns

### Toggle Between Move and Attack Modes

```typescript
function GameBoard() {
  const [mode, setMode] = useState<"move" | "attack" | "scan">("move");

  const handleCellClick = async (x: number, y: number) => {
    switch (mode) {
      case "move":
        await handleMove(x, y);
        break;
      case "attack":
        await handleAttack(x, y);
        break;
      case "scan":
        await handleScan(x, y);
        break;
    }
  };

  return (
    <div>
      <ModeSelector>
        <Button onClick={() => setMode("move")}>Move</Button>
        <Button onClick={() => setMode("attack")}>Attack</Button>
        <Button onClick={() => setMode("scan")}>Scan</Button>
      </ModeSelector>
      <Grid>{/* ... */}</Grid>
    </div>
  );
}
```

### Validate Moves Client-Side

```typescript
const isValidMove = (oldX: number, oldY: number, newX: number, newY: number): boolean => {
  const dx = Math.abs(newX - oldX);
  const dy = Math.abs(newY - oldY);
  const manhattanDistance = dx + dy;

  const maxRange = vehicleType === 0 ? 3 : vehicleType === 1 ? 2 : 1;

  // Check bounds
  if (newX < 0 || newX > 9 || newY < 0 || newY > 9) {
    return false;
  }

  // Check range
  return manhattanDistance <= maxRange;
};

const handleMove = async (newX: number, newY: number) => {
  if (!isValidMove(myPosition.x, myPosition.y, newX, newY)) {
    showError("Invalid move");
    return;
  }

  // ... generate proof
};
```

## Testing Your Integration

### Manual Testing Checklist

- [ ] Can I move my vehicle?
- [ ] Can I attack an opponent?
- [ ] Can I scan (if using Cycle)?
- [ ] Does the UI stay responsive during proof generation?
- [ ] Are errors handled gracefully?
- [ ] Does the game state update after chain confirmation?
- [ ] Is my salt never exposed in logs or network requests?

### Debug Tips

1. **Check the worker initialization**:
   ```typescript
   useEffect(() => {
     console.log("Worker initialized:", !!workerRef.current);
   }, []);
   ```

2. **Monitor proof generation time**:
   ```typescript
   const startTime = Date.now();
   const { proof, publicInputs } = await generateProof("movement", input);
   const duration = Date.now() - startTime;
   console.log(`Proof generated in ${duration}ms`);
   ```

3. **Verify inputs before proof generation**:
   ```typescript
   console.log("Proof inputs:", {
     vehicleType: input.vehicle_type,
     actionType: input.action_type,
     turnCounter: input.turn_counter,
     // Don't log salt or coordinates!
   });
   ```

## Troubleshooting

### Worker Not Initializing

**Symptoms**: `useProofWorker` always returns `error` status

**Solutions**:
1. Check browser console for Web Worker errors
2. Verify the worker file path is correct
3. Ensure TypeScript paths are configured in `tsconfig.json`
4. Check that the circuit JSON files are accessible

### Proof Generation Timeout

**Symptoms**: Proof generation hangs or takes > 30 seconds

**Solutions**:
1. Check circuit complexity (simpler circuits are faster)
2. Verify noir_js is working correctly
3. Try on a faster device or browser
4. Consider adding a timeout and retry logic

### Invalid Proof on Chain

**Symptoms**: Contract rejects the proof

**Solutions**:
1. Verify public inputs match what was submitted
2. Check that turn_counter is correct
3. Ensure commitments were computed correctly
4. Verify the circuit version matches what the contract expects

## Next Steps

1. Review the full `ProofGenerationExample.tsx` component
2. Check the `proofWorker.ts` implementation
3. Read the `workers/README.md` for detailed documentation
4. Run the test suite: `npm test`
5. Test in a local development environment

## Support

For issues or questions:
1. Check the console for error messages
2. Review the circuit documentation in `/circuits`
3. Verify your inputs match the circuit's expected format
4. Check the Soroban contract logs for verification errors
