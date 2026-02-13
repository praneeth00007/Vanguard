import type { Coordinate } from "@/lib/types";

export function manhattanDistance(a: Coordinate, b: Coordinate): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function withinRange(origin: Coordinate, target: Coordinate, range: number): boolean {
  return manhattanDistance(origin, target) <= range;
}

export function inBounds(coord: Coordinate): boolean {
  return coord.x >= 0 && coord.x <= 9 && coord.y >= 0 && coord.y <= 9;
}

export function buildGrid(): Coordinate[] {
  const cells: Coordinate[] = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}
