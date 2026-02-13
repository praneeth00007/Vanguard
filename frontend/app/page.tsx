"use client";

import GameBoard from "@/components/GameBoard";
import TurnStatus from "@/components/TurnStatus";
import VehiclePanel from "@/components/VehiclePanel";
import WalletConnect from "@/components/WalletConnect";
import { useGameStore } from "@/store/gameStore";

export default function HomePage() {
  const uiLocked = useGameStore((state) => state.uiLocked);
  const statusMessage = useGameStore((state) => state.statusMessage);

  return (
    <main>
      <div className="stack" style={{ marginBottom: 24 }}>
        <h1>Vanguard&apos;s Blindside</h1>
        <p className="fade">
          Fog-of-war tactical battles. Commit positions, move carefully, and attack with ZK proofs.
        </p>
        <div className="inline">
          <WalletConnect />
          <TurnStatus />
          {uiLocked && <span className="status-pill">Processing...</span>}
        </div>
        {statusMessage && <div className="status-pill">{statusMessage}</div>}
      </div>

      <div className="app-grid">
        <GameBoard />
        <VehiclePanel />
      </div>
    </main>
  );
}
