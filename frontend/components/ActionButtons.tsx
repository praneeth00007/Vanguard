"use client";

import { useGameStore } from "@/store/gameStore";
import { VEHICLE_BY_ID } from "@/lib/vehicles";

interface ActionButtonsProps {
  onScan?: () => void;
}

/**
 * Action buttons for Move, Attack, and Scan actions
 * Provides clear visual feedback and disables based on game state
 */
export default function ActionButtons({ onScan }: ActionButtonsProps) {
  const phase = useGameStore((state) => state.phase);
  const setPhase = useGameStore((state) => state.setPhase);
  const selectedVehicleId = useGameStore((state) => state.selectedVehicleId);
  const player = useGameStore((state) => state.player);
  const uiLocked = useGameStore((state) => state.uiLocked);
  const turn = useGameStore((state) => state.turn);

  const vehicle = VEHICLE_BY_ID[selectedVehicleId];
  const isMyTurn = turn.activePlayer === "self";
  const canScan = vehicle.id === "cycle";
  const isOnCooldown = player.cooldown > 0;

  const handlePhaseChange = (newPhase: "move" | "attack") => {
    if (uiLocked || !isMyTurn) return;
    setPhase(newPhase);
  };

  return (
    <div className="action-buttons">
      <div className="phase-selector">
        <button
          className={`phase-button ${phase === "move" ? "active" : ""}`}
          disabled={uiLocked || !isMyTurn}
          onClick={() => handlePhaseChange("move")}
        >
          <span className="phase-icon">🚶</span>
          <span className="phase-label">Move</span>
          {phase === "move" && <span className="phase-indicator">Active</span>}
        </button>

        <button
          className={`phase-button ${phase === "attack" ? "active" : ""} ${
            isOnCooldown ? "on-cooldown" : ""
          }`}
          disabled={uiLocked || !isMyTurn}
          onClick={() => handlePhaseChange("attack")}
        >
          <span className="phase-icon">⚔️</span>
          <span className="phase-label">Attack</span>
          {phase === "attack" && <span className="phase-indicator">Active</span>}
          {isOnCooldown && (
            <span className="cooldown-badge">
              ⏳ {player.cooldown} turn{player.cooldown > 1 ? "s" : ""}
            </span>
          )}
        </button>

        {canScan && onScan && (
          <button
            className={`phase-button scan ${phase === "scan" ? "active" : ""}`}
            disabled={uiLocked || !isMyTurn}
            onClick={onScan}
          >
            <span className="phase-icon">🔍</span>
            <span className="phase-label">Scan</span>
            {phase === "scan" && <span className="phase-indicator">Active</span>
            <span className="scan-badge">Cycle Only</span>
          </button>
        )}
      </div>

      {/* Phase Info */}
      <div className="phase-info">
        <div className="info-item">
          <span className="info-label">Vehicle:</span>
          <span className="info-value">
            {getVehicleIcon(vehicle.id)} {vehicle.name}
          </span>
        </div>

        {phase === "move" && (
          <div className="info-item">
            <span className="info-label">Move Range:</span>
            <span className="info-value">{vehicle.movementRange} tiles</span>
          </div>
        )}

        {phase === "attack" && (
          <div className="info-item">
            <span className="info-label">Attack Range:</span>
            <span className="info-value">{vehicle.attackRange} tiles</span>
          </div>
        )}

        {isOnCooldown && (
          <div className="info-item cooldown-warning">
            <span className="info-label">⚠️ Cooldown:</span>
            <span className="info-value">{player.cooldown} turn{player.cooldown > 1 ? "s" : ""} remaining</span>
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
