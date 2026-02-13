import type { VehicleSpec } from "@/lib/types";

export const VEHICLES: VehicleSpec[] = [
  {
    id: "cycle",
    name: "Cycle",
    description: "Fast scout with short attack range. Can scan 2x2 areas to detect enemies.",
    movementRange: 3,
    attackRange: 2,
    cooldownAfterAttack: 0,
    contractType: 0,
  },
  {
    id: "rover",
    name: "Rover",
    description: "Balanced striker with mid-range attacks and no cooldown. Versatile and reliable.",
    movementRange: 2,
    attackRange: 3,
    cooldownAfterAttack: 0,
    contractType: 1,
  },
  {
    id: "tank",
    name: "Tank",
    description: "Heavy hitter with wide attack range. Powerful but requires 1 turn cooldown after attacking.",
    movementRange: 1,
    attackRange: 4,
    cooldownAfterAttack: 1,
    contractType: 2,
  },
];

export const VEHICLE_BY_ID = Object.fromEntries(
  VEHICLES.map((vehicle) => [vehicle.id, vehicle])
) as Record<string, VehicleSpec>;
