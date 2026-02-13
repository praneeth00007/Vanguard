"use client";

import { useGameStore } from "@/store/gameStore";
import { VEHICLE_BY_ID } from "@/lib/vehicles";

/**
 * Enhanced turn indicator showing whose turn it is and game phase
 * Provides clear visual feedback for current game state
 */
export default function TurnIndicator() {
  const turn = useGameStore((state) => state.turn);
  const phase = useGameStore((state) => state.phase);
  const player = useGameStore((state) => state.player);
  const opponent = useGameStore((state) => state.opponent);
  const selectedVehicleId = useGameStore((state) => state.selectedVehicleId);

  const isMyTurn = turn.activePlayer === "self";
  const vehicle = VEHICLE_BY_ID[selectedVehicleId];

  return (
    <div className={`turn-indicator ${isMyTurn ? "my-turn" : "their-turn"}`}>
      <div className="turn-main">
        <div className="turn-number">
          <span className="turn-label">Turn</span>
          <span className="turn-value">{turn.turnCounter + 1}</span>
        </div>

        <div className="turn-status">
          {isMyTurn ? (
            <>
              <span className="turn-icon your-turn">⚡</span>
              <span className="turn-text your-turn">Your Turn</span>
            </>
          ) : (
            <>
              <span className="turn-icon their-turn">⏳</span>
              <span className="turn-text their-turn">Opponent's Turn</span>
            </>
          )}
        </div>
      </div>

      <div className="turn-details">
        <div className="turn-phase">
          <span className="phase-label">Phase:</span>
          <span className={`phase-value ${phase}`}>
            {phase === "move" ? "🚶 Move" : "⚔️ Attack"}
          </span>
        </div>

        <div className="turn-stats">
          <div className="stat">
            <span className="stat-label">Your HP:</span>
            <span className={`stat-value ${player.hp <= 1 ? "critical" : ""}`}>
              {player.hp}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Their HP:</span>
            <span className={`stat-value ${opponent.hp <= 1 ? "critical" : ""}`}>
              {opponent.hp}
            </span>
          </div>
        </div>

        {vehicle && (
          <div className="turn-vehicle">
            <span className="vehicle-icon">{getVehicleIcon(vehicle.id)}</span>
            <span className="vehicle-name">{vehicle.name}</span>
            <span className="vehicle-range">
              {vehicle.movementRange} 🚶 / {vehicle.attackRange} ⚔️
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function getVehicleIcon(vehicleId: string): string {
  switch (vehicleId) {
    case "cycle":
      return "🚴";
    case "rover":
      return "🚙";
    case "tank":
      return "🛡️";
    default:
      return "🚀";
  }
}
