export type VehicleId = "cycle" | "rover" | "tank";

export type VehicleSpec = {
  id: VehicleId;
  name: string;
  description: string;
  movementRange: number;
  attackRange: number;
  cooldownAfterAttack: number;
  contractType: number;
};

export type Coordinate = {
  x: number;
  y: number;
};

export type Marker = {
  id: string;
  coordinate: Coordinate;
  turnPlaced: number;
  type: "miss" | "hit" | "destroyed";
};

export type PlayerState = {
  hp: number;
  vehicleId: VehicleId;
  cooldown: number;
  commitment?: string;
  position?: Coordinate;
};

export type GamePhase = "move" | "attack";

export type TurnInfo = {
  turnCounter: number;
  activePlayer: "self" | "opponent";
};
