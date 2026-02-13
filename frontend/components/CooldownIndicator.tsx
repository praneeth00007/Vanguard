"use client";

import { useGameStore } from "@/store/gameStore";
import { VEHICLE_BY_ID } from "@/lib/vehicles";

/**
 * Visual cooldown indicator showing remaining cooldown turns
 * Displays as a progress bar with turn counter
 */
export default function CooldownIndicator() {
  const player = useGameStore((state) => state.player);
  const selectedVehicleId = useGameStore((state) => state.selectedVehicleId);
  const vehicle = VEHICLE_BY_ID[selectedVehicleId];
  const maxCooldown = vehicle.cooldownAfterAttack;

  // If no cooldown, don't display
  if (maxCooldown === 0) return null;

  const cooldownRemaining = player.cooldown;
  const isOnCooldown = cooldownRemaining > 0;

  // Calculate progress percentage
  const progress = maxCooldown > 0 ? ((maxCooldown - cooldownRemaining) / maxCooldown) * 100 : 0;

  return (
    <div className="cooldown-indicator">
      <div className="cooldown-header">
        <span className="cooldown-icon">⏳</span>
        <span className="cooldown-text">
          {isOnCooldown ? `Cooldown: ${cooldownRemaining} turn${cooldownRemaining > 1 ? "s" : ""}` : "Ready"}
        </span>
      </div>

      {maxCooldown > 0 && (
        <div className="cooldown-bar-container">
          <div
            className={`cooldown-bar ${isOnCooldown ? "active" : "ready"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isOnCooldown && (
        <div className="cooldown-hint">
          <small>Cannot attack until cooldown expires</small>
        </div>
      )}
    </div>
  );
}
