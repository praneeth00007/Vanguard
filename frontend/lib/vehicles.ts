import type { VehicleSpec } from "@/lib/types";

export const VEHICLES: VehicleSpec[] = [
  {
    id: "cycle",
    name: "Cycle",
    description: "Fast scout with short attack range and quick turns.",
    movementRange: 3,
    attackRange: 2,
    cooldownAfterAttack: 0,
    contractType: 0,
  },
  {
    id: "rover",
    name: "Rover",
    description: "Balanced mover with mid-range attacks.",
    movementRange: 2,
    attackRange: 3,
    cooldownAfterAttack: 0,
    contractType: 1,
  },
  {
    id: "tank",
    name: "Tank",
    description: "Slow mover with wide attack range and cooldown.",
    movementRange: 1,
    attackRange: 4,
    cooldownAfterAttack: 1,
    contractType: 2,
  },
];

export const VEHICLE_BY_ID = Object.fromEntries(
  VEHICLES.map((vehicle) => [vehicle.id, vehicle])
) as Record<string, VehicleSpec>;
