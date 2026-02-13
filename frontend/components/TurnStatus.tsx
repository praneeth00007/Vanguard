"use client";

import { useGameStore } from "@/store/gameStore";

export default function TurnStatus() {
  const turn = useGameStore((state) => state.turn);

  return (
    <div className="status-pill">
      Turn {turn.turnCounter + 1} · {turn.activePlayer === "self" ? "Your move" : "Opponent"}
    </div>
  );
}
