"use client";

import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import type { Coordinate } from "@/lib/types";

interface ScanVisualizationProps {
  onScanSelect: (scanX: number, scanY: number) => void;
  disabled?: boolean;
}

/**
 * Scan visualization showing Cycle's 2x2 scan area
 * Displays grid highlighting scanable 2x2 zones
 */
export default function ScanVisualization({ onScanSelect, disabled }: ScanVisualizationProps) {
  const player = useGameStore((state) => state.player);
  const opponent = useGameStore((state) => state.opponent);
  const markers = useGameStore((state) => state.markers);

  const currentPosition = player.position ?? { x: 0, y: 0 };

  // Generate all possible 2x2 scan areas (top-left corners only)
  // Grid is 10x10, so valid scan_x goes 0-8, scan_y goes 0-8
  const scanAreas = useMemo(() => {
    const areas: Array<{ x: number; y: number; containsOpponent: boolean }> = [];

    for (let x = 0; x <= 8; x++) {
      for (let y = 0; y <= 8; y++) {
        // Check if this scan area contains the opponent
        const opponentInArea =
          opponent.position &&
          opponent.position.x >= x &&
          opponent.position.x <= x + 1 &&
          opponent.position.y >= y &&
          opponent.position.y <= y + 1;

        // Check if any miss markers are in this area
        const markersInArea = markers.filter(
          (marker) =>
            marker.type === "miss" &&
            marker.coordinate.x >= x &&
            marker.coordinate.x <= x + 1 &&
            marker.coordinate.y >= y &&
            marker.coordinate.y <= y + 1
        );

        areas.push({
          x,
          y,
          containsOpponent: opponentInArea || false,
          hasMarkers: markersInArea.length > 0,
          markerCount: markersInArea.length,
        });
      }
    }

    return areas;
  }, [opponent.position, markers]);

  const handleScanAreaClick = (x: number, y: number) => {
    if (disabled) return;
    onScanSelect(x, y);
  };

  return (
    <div className="scan-visualization">
      <div className="scan-header">
        <h3>🔍 Cycle Scan (2x2)</h3>
        <p className="fade">Click a 2x2 area to scan for enemy presence</p>
      </div>

      <div className="scan-grid">
        {scanAreas.map((area) => {
          const isSelected =
            currentPosition.x >= area.x &&
            currentPosition.x <= area.x + 1 &&
            currentPosition.y >= area.y &&
            currentPosition.y <= area.y + 1;

          const areaClasses = [
            "scan-area",
            disabled ? "disabled" : "",
            isSelected ? "selected" : "",
            area.containsOpponent ? "enemy-detected" : "",
            area.hasMarkers ? "has-markers" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={`${area.x}-${area.y}`}
              className={areaClasses}
              disabled={disabled}
              onClick={() => handleScanAreaClick(area.x, area.y)}
              title={`Scan area (${area.x}, ${area.y})`}
            >
              <div className="scan-area-content">
                <span className="scan-coords">{area.x},{area.y}</span>
                {area.containsOpponent && (
                  <span className="scan-indicator enemy">⚠️</span>
                )}
                {area.hasMarkers && (
                  <span className="scan-indicator markers">
                    {area.markerCount} <span className="fade">X</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="scan-legend">
        <div className="legend-item">
          <div className="legend-box scan-area selected" />
          <span>Your position</span>
        </div>
        <div className="legend-item">
          <div className="legend-box scan-area enemy-detected" />
          <span>Enemy detected</span>
        </div>
        <div className="legend-item">
          <div className="legend-box scan-area has-markers" />
          <span>Has miss markers</span>
        </div>
      </div>
    </div>
  );
}
