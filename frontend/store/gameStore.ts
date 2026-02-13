import { create } from "zustand";
import type { Coordinate, GamePhase, Marker, PlayerState, TurnInfo, VehicleId } from "@/lib/types";
import { VEHICLE_BY_ID } from "@/lib/vehicles";

export type GameState = {
  walletAddress?: string;
  player: PlayerState;
  opponent: PlayerState;
  markers: Marker[];
  selectedVehicleId: VehicleId;
  phase: GamePhase;
  uiLocked: boolean;
  statusMessage?: string;
  turn: TurnInfo;
  setWalletAddress: (address?: string) => void;
  setPhase: (phase: GamePhase) => void;
  setSelectedVehicle: (vehicleId: VehicleId) => void;
  setPlayerPosition: (coordinate: Coordinate) => void;
  setOpponentDestroyed: (coordinate: Coordinate) => void;
  pushMarker: (marker: Marker) => void;
  decayMarkers: () => void;
  setStatusMessage: (message?: string) => void;
  lockUi: (message?: string) => void;
  unlockUi: () => void;
  advanceTurn: () => void;
  applyHit: () => void;
  applyCooldown: (turns: number) => void;
  decrementCooldowns: () => void;
};

const initialVehicle: VehicleId = "cycle";

export const useGameStore = create<GameState>((set, get) => ({
  walletAddress: undefined,
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
  setWalletAddress: (address) => set({ walletAddress: address }),
  setPhase: (phase) => set({ phase }),
  setSelectedVehicle: (vehicleId) => set({ selectedVehicleId: vehicleId }),
  setPlayerPosition: (coordinate) =>
    set((state) => ({ player: { ...state.player, position: coordinate } })),
  setOpponentDestroyed: (coordinate) =>
    set((state) => ({ opponent: { ...state.opponent, position: coordinate } })),
  pushMarker: (marker) => set((state) => ({ markers: [...state.markers, marker] })),
  decayMarkers: () =>
    set((state) => {
      const currentTurn = state.turn.turnCounter;
      return {
        markers: state.markers.filter((marker) => {
          if (marker.type !== "miss") return true;
          return currentTurn - marker.turnPlaced < 2;
        }),
      };
    }),
  setStatusMessage: (message) => set({ statusMessage: message }),
  lockUi: (message) => set({ uiLocked: true, statusMessage: message ?? "" }),
  unlockUi: () => set({ uiLocked: false }),
  advanceTurn: () =>
    set((state) => ({
      turn: {
        turnCounter: state.turn.turnCounter + 1,
        activePlayer: state.turn.activePlayer === "self" ? "opponent" : "self",
      },
    })),
  applyHit: () =>
    set((state) => ({
      opponent: {
        ...state.opponent,
        hp: Math.max(0, state.opponent.hp - 1),
      },
    })),
  applyCooldown: (turns) =>
    set((state) => ({
      player: {
        ...state.player,
        cooldown: Math.max(state.player.cooldown, turns),
      },
    })),
  decrementCooldowns: () =>
    set((state) => ({
      player: {
        ...state.player,
        cooldown: Math.max(0, state.player.cooldown - 1),
      },
      opponent: {
        ...state.opponent,
        cooldown: Math.max(0, state.opponent.cooldown - 1),
      },
    })),
}));

export function getSelectedVehicleSpec(state = useGameStore.getState()) {
  return VEHICLE_BY_ID[state.selectedVehicleId];
}
