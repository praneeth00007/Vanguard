# Quick Integration Guide - UX Components

## Overview

This guide provides quick instructions for integrating the new UX components into the Vanguard Blindside game.

## Component Summary

| Component | Purpose | File |
|-----------|---------|-------|
| CooldownIndicator | Visual cooldown bar | `components/CooldownIndicator.tsx` |
| ScanVisualization | 2x2 scan grid | `components/ScanVisualization.tsx` |
| TurnIndicator | Enhanced turn display | `components/TurnIndicator.tsx` |
| GameOverModal | End-game reveal | `components/GameOverModal.tsx` |
| ActionButtons | Phase selector | `components/ActionButtons.tsx` |
| RangeIndicator | Visual range overlay | `components/RangeIndicator.tsx` |

## Step 1: Import CSS

Add to your main layout or page:

```typescript
// app/page.tsx or app/layout.tsx
import "@/app/game-over.css";
```

## Step 2: Update Game Page Structure

Create a new game page structure:

```typescript
// app/page.tsx
"use client";

import { useGameStore } from "@/store/gameStore";
import TurnIndicator from "@/components/TurnIndicator";
import ActionButtons from "@/components/ActionButtons";
import GameBoard from "@/components/GameBoard";
import VehiclePanel from "@/components/VehiclePanel";
import CooldownIndicator from "@/components/CooldownIndicator";
import ScanVisualization from "@/components/ScanVisualization";
import GameOverModal from "@/components/GameOverModal";

export default function GamePage() {
  const player = useGameStore((state) => state.player);
  const opponent = useGameStore((state) => state.opponent);
  const selectedVehicleId = useGameStore((state) => state.selectedVehicleId);
  const turn = useGameStore((state) => state.turn);
  const phase = useGameStore((state) => state.phase);

  const isGameOver = player.hp === 0 || opponent.hp === 0;
  const isCycle = selectedVehicleId === "cycle";

  // Handle game reset
  const handlePlayAgain = () => {
    // Reset game state
    useGameStore.getState().resetGame?.();
  };

  // Handle scan action
  const handleScan = (scanX: number, scanY: number) => {
    // Generate scan proof and submit to contract
    console.log(`Scanning area (${scanX}, ${scanY})`);
  };

  return (
    <div className="game-container">
      {/* Game Over Modal */}
      {isGameOver && (
        <GameOverModal
          onPlayAgain={handlePlayAgain}
          onExit={() => window.location.href = "/"}
        />
      )}

      {/* Header with Turn Indicator */}
      <header className="game-header">
        <TurnIndicator />
      </header>

      {/* Main Game Content */}
      <main className="game-main">
        {/* Left Panel - Vehicle Selection */}
        <aside className="game-sidebar">
          <VehiclePanel />
          <CooldownIndicator />
        </aside>

        {/* Center - Game Board */}
        <section className="game-board-section">
          <ActionButtons
            onScan={isCycle ? () => setPhase("scan") : undefined}
          />

          {/* Show Scan Visualization in Scan Phase */}
          {phase === "scan" && isCycle && (
            <ScanVisualization
              onScanSelect={handleScan}
              disabled={turn.activePlayer !== "self"}
            />
          )}

          {/* Show Game Board in Move/Attack Phase */}
          {phase !== "scan" && <GameBoard />}
        </section>

        {/* Right Panel - Info */}
        <aside className="game-info">
          {/* Add game stats, logs, etc. */}
        </aside>
      </main>
    </div>
  );
}
```

## Step 3: Update GameStore (Optional)

Add a reset function to the game store:

```typescript
// store/gameStore.ts
export type GameState = {
  // ... existing types
  resetGame: () => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  // ... existing state
  resetGame: () =>
    set({
      player: {
        hp: 3,
        vehicleId: initialVehicle,
        cooldown: 0,
        position: { x: 0, y: 0 },
      },
      opponent: {
        hp: 3,
        vehicleId: "tank",
        cooldown: 0,
      },
      markers: [],
      selectedVehicleId: initialVehicle,
      phase: "move",
      uiLocked: false,
      statusMessage: undefined,
      turn: {
        turnCounter: 0,
        activePlayer: "self",
      },
    }),
}));
```

## Step 4: Update Types (If Needed)

Add scan phase to types:

```typescript
// lib/types.ts
export type GamePhase = "move" | "attack" | "scan";
```

## Step 5: Add Scan Proof Generation

Create a function to handle scan proofs:

```typescript
// lib/scanProof.ts
import { generateProof } from "@/hooks/useProofWorker";
import { buildScanInput } from "@/lib/proofInputs";

export async function handleScanProof(
  scanX: number,
  scanY: number,
  scannerPosition: Coordinate,
  defenderPosition: Coordinate,
  scannerSalt: string,
  defenderSalt: string,
  turnCounter: number
) {
  // Determine if defender is in scan area
  const inScanArea =
    defenderPosition.x >= scanX &&
    defenderPosition.x <= scanX + 1 &&
    defenderPosition.y >= scanY &&
    defenderPosition.y <= scanY + 1;

  const proofInput = buildScanInput({
    scannerPosition,
    defenderPosition,
    scannerSalt,
    defenderSalt,
    scanPosition: { x: scanX, y: scanY },
    vehicleId: 0, // Cycle
    turnCounter,
    claimedScanHit: inScanArea,
  });

  const proof = await generateProof({
    circuit: "scan",
    input: proofInput,
  });

  return { proof, detected: inScanArea };
}
```

## Step 6: Update Proof Inputs

Add scan input builder:

```typescript
// lib/proofInputs.ts
export function buildScanInput(params: {
  scannerPosition: Coordinate;
  defenderPosition: Coordinate;
  scannerSalt: string;
  defenderSalt: string;
  scanPosition: Coordinate;
  vehicleId: number;
  turnCounter: number;
  claimedScanHit: boolean;
}) {
  return {
    scanner_x: params.scannerPosition.x,
    scanner_y: params.scannerPosition.y,
    scanner_salt: params.scannerSalt,
    defender_x: params.defenderPosition.x,
    defender_y: params.defenderPosition.y,
    defender_salt: params.defenderSalt,
    scanner_hash: "0x".padEnd(66, "0"), // From contract
    defender_hash: "0x".padEnd(66, "0"), // From contract
    scan_x: params.scanPosition.x,
    scan_y: params.scanPosition.y,
    vehicle_type: params.vehicleId,
    action_type: 2, // Scan action
    turn_counter: params.turnCounter,
    claimed_scan_hit: params.claimedScanHit,
  };
}
```

## Step 7: Style Adjustments (Optional)

Add custom CSS variables to your global styles:

```css
/* app/globals.css */
:root {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --text-primary: #ffffff;
  --text-muted: #888888;
  --accent-primary: #3b82f6;
  --accent-danger: #ef4444;
  --accent-warning: #f59e0b;
  --border-color: #444444;
}

.game-container {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 16px;
}

.game-header {
  margin-bottom: 16px;
}

.game-main {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.game-sidebar,
.game-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.game-board-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 1024px) {
  .game-main {
    grid-template-columns: 1fr;
  }

  .game-sidebar,
  .game-info {
    order: 2;
  }

  .game-board-section {
    order: 1;
  }
}
```

## Testing Your Integration

### Manual Testing

1. **Start Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test Each Component**:
   - [ ] Turn indicator shows correct turn
   - [ ] Phase buttons work (Move/Attack/Scan)
   - [ ] Cooldown appears after tank attacks
   - [ ] Scan visualization shows 9x9 grid
   - [ ] Clicking scan areas works
   - [ ] Game over modal appears when HP hits 0
   - [ ] Game over reveal shows positions correctly

3. **Test Animations**:
   - [ ] Turn indicator transitions smoothly
   - [ ] Cooldown bar animates
   - [ ] Game over modal staggers correctly
   - [ ] Mini-map displays correctly

### Browser Testing

Test in multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

## Common Issues and Solutions

### Issue: Scan visualization not showing

**Solution**: Make sure the CSS is imported:
```typescript
import "@/app/game-over.css";
```

### Issue: Game over modal not appearing

**Solution**: Check the game state:
```typescript
const isGameOver = player.hp === 0 || opponent.hp === 0;
console.log("Game over?", isGameOver, { player, opponent });
```

### Issue: Scan button not visible

**Solution**: Only Cycle can scan:
```typescript
{selectedVehicleId === "cycle" && (
  <ActionButtons onScan={() => setPhase("scan")} />
)}
```

### Issue: Animations not playing

**Solution**: Check that CSS is loaded and browser supports animations.

## Next Steps

1. **Integrate All Components**: Follow this guide to add all new components
2. **Test Thoroughly**: Use the testing checklist
3. **Adjust Styles**: Customize colors and spacing as needed
4. **Add Polish**: Add your own enhancements on top of these components

## Support

For detailed documentation:
- See `UX_IMPROVEMENTS.md` for full feature descriptions
- See component files for inline comments
- Check TypeScript types for API details
