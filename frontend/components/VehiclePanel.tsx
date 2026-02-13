"use client";

import { VEHICLES } from "@/lib/vehicles";
import { useGameStore } from "@/store/gameStore";

export default function VehiclePanel() {
  const selectedVehicleId = useGameStore((state) => state.selectedVehicleId);
  const setSelectedVehicle = useGameStore((state) => state.setSelectedVehicle);
  const player = useGameStore((state) => state.player);
  const opponent = useGameStore((state) => state.opponent);
  const phase = useGameStore((state) => state.phase);
  const uiLocked = useGameStore((state) => state.uiLocked);

  return (
    <div className="panel stack">
      <div>
        <h2>Vehicles</h2>
        <p className="fade">Select your unit before moving or attacking.</p>
      </div>

      <div>
        {VEHICLES.map((vehicle) => {
          const isSelected = selectedVehicleId === vehicle.id;
          const isDisabled = uiLocked;
          return (
            <div
              key={vehicle.id}
              className={`vehicle-card ${isSelected ? "selected" : ""} ${
                isDisabled ? "disabled" : ""
              }`}
              onClick={() => {
                if (isDisabled) return;
                setSelectedVehicle(vehicle.id);
              }}
            >
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <strong>{vehicle.name}</strong>
                {isSelected && <span className="tag">Selected</span>}
              </div>
              <p className="fade" style={{ margin: "6px 0 12px" }}>
                {vehicle.description}
              </p>
              <div className="inline" style={{ flexWrap: "wrap", gap: 8 }}>
                <span className="tag">Move {vehicle.movementRange}</span>
                <span className="tag">Attack {vehicle.attackRange}</span>
                {vehicle.cooldownAfterAttack > 0 && <span className="tag">Cooldown {vehicle.cooldownAfterAttack}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <h3>Status</h3>
        <div className="stack" style={{ gap: 8, marginTop: 8 }}>
          <div className="inline">
            <span className="tag">Your HP</span>
            <strong>{player.hp}</strong>
          </div>
          <div className="inline">
            <span className="tag">Opponent HP</span>
            <strong>{opponent.hp}</strong>
          </div>
          <div className="inline">
            <span className="tag">Phase</span>
            <strong>{phase === "move" ? "Movement" : "Attack"}</strong>
          </div>
          <div className="inline">
            <span className="tag">Cooldown</span>
            <strong>{player.cooldown}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
