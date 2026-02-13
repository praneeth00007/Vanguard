"use client";

import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { withinRange } from "@/lib/range";
import type { Coordinate } from "@/lib/types";

interface RangeIndicatorProps {
  position: Coordinate;
  showMoveRange?: boolean;
  showAttackRange?: boolean;
  moveRange?: number;
  attackRange?: number;
}

/**
 * Visual range indicator showing valid move and attack tiles
 * Provides clear visual feedback for player actions
 */
export default function RangeIndicator({
  position,
  showMoveRange = true,
  showAttackRange = true,
  moveRange = 0,
  attackRange = 0,
}: RangeIndicatorProps) {
  const phase = useGameStore((state) => state.phase);

  // Generate all grid coordinates
  const allCoordinates = useMemo(() => {
    const coords: Coordinate[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        coords.push({ x, y });
      }
    }
    return coords;
  }, []);

  const isInMoveRange = (coord: Coordinate) =>
    phase === "move" && showMoveRange && withinRange(position, coord, moveRange);

  const isInAttackRange = (coord: Coordinate) =>
    phase === "attack" && showAttackRange && withinRange(position, coord, attackRange);

  return (
    <div className="range-indicator">
      <div className="range-legend">
        {showMoveRange && (
          <div className="legend-item move">
            <div className="legend-color move-range" />
            <span>Move Range: {moveRange}</span>
          </div>
        )}
        {showAttackRange && (
          <div className="legend-item attack">
            <div className="legend-color attack-range" />
            <span>Attack Range: {attackRange}</span>
          </div>
        )}
      </div>

      <div className="range-grid">
        {allCoordinates.map((coord) => {
          const isMoveTile = isInMoveRange(coord);
          const isAttackTile = isInAttackRange(coord);
          const isCurrentPos = coord.x === position.x && coord.y === position.y;

          if (!isMoveTile && !isAttackTile && !isCurrentPos) return null;

          const cellClasses = [
            "range-cell",
            isMoveTile ? "move-range" : "",
            isAttackTile ? "attack-range" : "",
            isCurrentPos ? "current-position" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={`${coord.x}-${coord.y}`}
              className={cellClasses}
              style={{
                left: `${coord.x * 10}%`,
                top: `${coord.y * 10}%`,
              }}
            >
              {isCurrentPos && <span className="position-marker">●</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
