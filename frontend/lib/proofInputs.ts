import type { Coordinate, VehicleId } from "@/lib/types";
import { VEHICLE_BY_ID } from "@/lib/vehicles";

export type MovementProofInput = {
  oldPosition: Coordinate;
  newPosition: Coordinate;
  salt: string;
  oldHash: string;
  newHash: string;
  vehicleId: VehicleId;
  turnCounter: number;
};

export type AttackProofInput = {
  attackerPosition: Coordinate;
  defenderPosition: Coordinate;
  attackerSalt: string;
  defenderSalt: string;
  attackerHash: string;
  defenderHash: string;
  target: Coordinate;
  vehicleId: VehicleId;
  turnCounter: number;
  claimedHit: boolean;
};

export function buildMovementInput(input: MovementProofInput) {
  const vehicle = VEHICLE_BY_ID[input.vehicleId];
  return {
    old_x: input.oldPosition.x,
    old_y: input.oldPosition.y,
    new_x: input.newPosition.x,
    new_y: input.newPosition.y,
    salt: input.salt,
    old_hash: input.oldHash,
    new_hash: input.newHash,
    vehicle_type: vehicle.contractType,
    action_type: 0,
    turn_counter: input.turnCounter,
  };
}

export function buildAttackInput(input: AttackProofInput) {
  const vehicle = VEHICLE_BY_ID[input.vehicleId];
  return {
    attacker_x: input.attackerPosition.x,
    attacker_y: input.attackerPosition.y,
    attacker_salt: input.attackerSalt,
    defender_x: input.defenderPosition.x,
    defender_y: input.defenderPosition.y,
    defender_salt: input.defenderSalt,
    attacker_hash: input.attackerHash,
    defender_hash: input.defenderHash,
    target_x: input.target.x,
    target_y: input.target.y,
    vehicle_type: vehicle.contractType,
    action_type: 1,
    turn_counter: input.turnCounter,
    claimed_hit: input.claimedHit,
  };
}
