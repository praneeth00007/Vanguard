"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";

interface GameOverModalProps {
  onPlayAgain?: () => void;
  onExit?: () => void;
}

/**
 * Game over modal with end-game reveal animation
 * Shows the final positions of both players and victory/defeat message
 */
export default function GameOverModal({ onPlayAgain, onExit }: GameOverModalProps) {
  const player = useGameStore((state) => state.player);
  const opponent = useGameStore((state) => state.opponent);
  const markers = useGameStore((state) => state.markers);

  const [showReveal, setShowReveal] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const isVictory = opponent.hp === 0;
  const isDefeat = player.hp === 0;

  useEffect(() => {
    // Staggered animation sequence
    const revealTimer = setTimeout(() => setShowReveal(true), 300);
    const contentTimer = setTimeout(() => setShowContent(true), 600);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(contentTimer);
    };
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-content game-over-modal">
        {/* Victory/Defeat Banner */}
        <div className={`game-result ${showReveal ? "visible" : ""}`}>
          {isVictory ? (
            <div className="victory-banner">
              <span className="result-icon">🏆</span>
              <h1>VICTORY</h1>
              <p>You destroyed the enemy vehicle!</p>
            </div>
          ) : (
            <div className="defeat-banner">
              <span className="result-icon">💀</span>
              <h1>DEFEAT</h1>
              <p>Your vehicle has been destroyed</p>
            </div>
          )}
        </div>

        {/* Reveal Section */}
        {showContent && (
          <>
            <div className="reveal-section">
              <h2>⚡ Final Position Reveal ⚡</h2>
              <p className="fade">Both vehicles' positions revealed at game end</p>

              <div className="reveal-grid">
                <div className="reveal-panel your-panel">
                  <h3>Your Vehicle</h3>
                  <div className="reveal-info">
                    <div className="reveal-position">
                      <span className="position-label">Position:</span>
                      <span className="position-value your-pos">
                        ({player.position?.x ?? 0}, {player.position?.y ?? 0})
                      </span>
                    </div>
                    <div className="reveal-hp">
                      <span className="hp-label">HP:</span>
                      <span className="hp-value">{player.hp}/3</span>
                    </div>
                  </div>
                </div>

                <div className="reveal-divider">
                  <span className="vs-text">VS</span>
                </div>

                <div className="reveal-panel enemy-panel">
                  <h3>Enemy Vehicle</h3>
                  <div className="reveal-info">
                    <div className="reveal-position">
                      <span className="position-label">Position:</span>
                      <span className="position-value enemy-pos">
                        ({opponent.position?.x ?? "?"}, {opponent.position?.y ?? "?"})
                      </span>
                    </div>
                    <div className="reveal-hp">
                      <span className="hp-label">HP:</span>
                      <span className="hp-value">{opponent.hp}/3</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Map with Reveal */}
              <div className="mini-map">
                <h4>Battle Grid (Final)</h4>
                <div className="mini-grid">
                  {Array.from({ length: 10 }).map((_, y) =>
                    Array.from({ length: 10 }).map((_, x) => {
                      const isYourPos =
                        player.position?.x === x && player.position?.y === y;
                      const isEnemyPos =
                        opponent.position?.x === x && opponent.position?.y === y;
                      const hasMarker = markers.some(
                        (m) => m.coordinate.x === x && m.coordinate.y === y
                      );

                      const cellClasses = [
                        "mini-cell",
                        isYourPos ? "your-pos" : "",
                        isEnemyPos ? "enemy-pos" : "",
                        hasMarker ? "has-marker" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={`${x}-${y}`}
                          className={cellClasses}
                        >
                          {isYourPos && "🚀"}
                          {isEnemyPos && "🎯"}
                          {hasMarker && "X"}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Game Statistics */}
              <div className="game-stats">
                <h4>Game Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Turns Played:</span>
                    <span className="stat-value">
                      {useGameStore.getState().turn.turnCounter + 1}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Attacks:</span>
                    <span className="stat-value">
                      {markers.filter((m) => m.type === "hit").length}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Misses:</span>
                    <span className="stat-value">
                      {markers.filter((m) => m.type === "miss").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              {onPlayAgain && (
                <button className="button primary" onClick={onPlayAgain}>
                  🔄 Play Again
                </button>
              )}
              {onExit && (
                <button className="button secondary" onClick={onExit}>
                  🚪 Exit
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
