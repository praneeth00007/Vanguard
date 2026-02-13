"use client";

import { useMemo } from "react";
import { buildGrid, inBounds, withinRange } from "@/lib/range";
import { useGameStore, getSelectedVehicleSpec } from "@/store/gameStore";
import type { Coordinate } from "@/lib/types";
import { useProofWorker } from "@/hooks/useProofWorker";
import { buildAttackInput, buildMovementInput } from "@/lib/proofInputs";
import { generateSaltHex, loadSalt, saveSalt } from "@/lib/salts";
import { getHubClient, getVerifierId } from "@/lib/hubClient";

const GRID = buildGrid();

export default function GameBoard() {
  const player = useGameStore((state) => state.player);
  const opponent = useGameStore((state) => state.opponent);
  const phase = useGameStore((state) => state.phase);
  const markers = useGameStore((state) => state.markers);
  const uiLocked = useGameStore((state) => state.uiLocked);
  const turn = useGameStore((state) => state.turn);
  const walletAddress = useGameStore((state) => state.walletAddress);

  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const pushMarker = useGameStore((state) => state.pushMarker);
  const setOpponentDestroyed = useGameStore((state) => state.setOpponentDestroyed);
  const lockUi = useGameStore((state) => state.lockUi);
  const unlockUi = useGameStore((state) => state.unlockUi);
  const advanceTurn = useGameStore((state) => state.advanceTurn);
  const applyHit = useGameStore((state) => state.applyHit);
  const applyCooldown = useGameStore((state) => state.applyCooldown);
  const decrementCooldowns = useGameStore((state) => state.decrementCooldowns);
  const decayMarkers = useGameStore((state) => state.decayMarkers);
  const setStatusMessage = useGameStore((state) => state.setStatusMessage);

  const selectedVehicle = getSelectedVehicleSpec();
  const { generateProof, isBusy } = useProofWorker();

  const currentPosition = player.position ?? { x: 0, y: 0 };

  const validMoveTiles = useMemo(() => {
    return GRID.filter((coord) => withinRange(currentPosition, coord, selectedVehicle.movementRange));
  }, [currentPosition, selectedVehicle.movementRange]);

  const validAttackTiles = useMemo(() => {
    return GRID.filter((coord) => withinRange(currentPosition, coord, selectedVehicle.attackRange));
  }, [currentPosition, selectedVehicle.attackRange]);

  const disableInteraction = uiLocked || isBusy || turn.activePlayer !== "self" || !walletAddress;

  const handleMove = async (coordinate: Coordinate) => {
    if (!player.position) {
      setPlayerPosition(coordinate);
      return;
    }

    if (!withinRange(currentPosition, coordinate, selectedVehicle.movementRange)) return;

    lockUi("Generating movement proof...");

    try {
      const storedSalt = loadSalt();
      const playerSalt = storedSalt?.playerSalt ?? generateSaltHex();
      saveSalt({ playerSalt });

      // TODO: Compute Poseidon commitments off-chain to match circuit constraints.
      const oldHash = player.commitment ?? "0x".padEnd(66, "0");
      const newHash = player.commitment ?? "0x".padEnd(66, "0");

      const proofInput = buildMovementInput({
        oldPosition: currentPosition,
        newPosition: coordinate,
        salt: playerSalt,
        oldHash,
        newHash,
        vehicleId: selectedVehicle.id,
        turnCounter: turn.turnCounter,
      });

      const proof = await generateProof({
        circuit: "movement",
        input: proofInput,
      });

      const hub = getHubClient();
      await hub.move_unit({
        player: walletAddress ?? "",
        verifier: getVerifierId(),
        proof: proof.proof,
        publicInputs: proof.publicInputs,
      });

      setPlayerPosition(coordinate);
      setStatusMessage("Move submitted");
      decrementCooldowns();
      advanceTurn();
      decayMarkers();
    } catch (error) {
      console.error(error);
    } finally {
      unlockUi();
    }
  };

  const handleAttack = async (coordinate: Coordinate) => {
    if (player.cooldown > 0) return;
    if (!withinRange(currentPosition, coordinate, selectedVehicle.attackRange)) return;

    lockUi("Generating attack proof...");

    try {
      const storedSalt = loadSalt();
      const attackerSalt = storedSalt?.playerSalt ?? generateSaltHex();
      saveSalt({ playerSalt: attackerSalt });

      // NOTE: In production the defender generates this proof. This sample flow
      // uses local placeholder data to demonstrate the pipeline end-to-end.
      const defenderSalt = generateSaltHex();

      const claimedHit = opponent.position?.x === coordinate.x && opponent.position?.y === coordinate.y;

      const proofInput = buildAttackInput({
        attackerPosition: currentPosition,
        defenderPosition: opponent.position ?? { x: 0, y: 0 },
        attackerSalt,
        defenderSalt,
        attackerHash: player.commitment ?? "0x".padEnd(66, "0"),
        defenderHash: opponent.commitment ?? "0x".padEnd(66, "0"),
        target: coordinate,
        vehicleId: selectedVehicle.id,
        turnCounter: turn.turnCounter,
        claimedHit,
      });

      const proof = await generateProof({
        circuit: "attack",
        input: proofInput,
      });

      const hub = getHubClient();
      await hub.attack({
        attacker: walletAddress ?? "",
        verifier: getVerifierId(),
        proof: proof.proof,
        publicInputs: proof.publicInputs,
      });

      if (claimedHit) {
        applyHit();
        setStatusMessage("HIT confirmed");
        if (opponent.hp - 1 <= 0) {
          setOpponentDestroyed(coordinate);
        }
      } else {
        setStatusMessage("MISS");
        pushMarker({
          id: `${coordinate.x}-${coordinate.y}-${turn.turnCounter}`,
          coordinate,
          type: "miss",
          turnPlaced: turn.turnCounter,
        });
      }

      if (selectedVehicle.cooldownAfterAttack > 0) {
        applyCooldown(selectedVehicle.cooldownAfterAttack);
      }

      decrementCooldowns();
      advanceTurn();
      decayMarkers();
    } catch (error) {
      console.error(error);
    } finally {
      unlockUi();
    }
  };

  const handleCellClick = (coordinate: Coordinate) => {
    if (disableInteraction) return;

    if (phase === "move") {
      handleMove(coordinate);
    } else {
      handleAttack(coordinate);
    }
  };

  const isInMoveRange = (coordinate: Coordinate) =>
    phase === "move" && validMoveTiles.some((coord) => coord.x === coordinate.x && coord.y === coordinate.y);
  const isInAttackRange = (coordinate: Coordinate) =>
    phase === "attack" && validAttackTiles.some((coord) => coord.x === coordinate.x && coord.y === coordinate.y);

  const markerByCell = (coordinate: Coordinate) =>
    markers.find((marker) => marker.coordinate.x === coordinate.x && marker.coordinate.y === coordinate.y);

  return (
    <div className="panel stack">
      <div className="inline" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Battle Grid</h2>
          <p className="fade">Fog of war is active. Opponent position is hidden until destroyed.</p>
        </div>
        <div className="inline">
          <button
            className="button"
            disabled={disableInteraction}
            onClick={() => useGameStore.getState().setPhase(phase === "move" ? "attack" : "move")}
          >
            Switch to {phase === "move" ? "Attack" : "Move"}
          </button>
        </div>
      </div>

      <div className="grid">
        {GRID.map((coordinate) => {
          const marker = markerByCell(coordinate);
          const isSelected =
            player.position?.x === coordinate.x && player.position?.y === coordinate.y;
          const isDestroyed =
            opponent.position?.x === coordinate.x && opponent.position?.y === coordinate.y && opponent.hp === 0;

          const cellClasses = [
            "grid-cell",
            disableInteraction ? "" : "clickable",
            isInMoveRange(coordinate) ? "move-range" : "",
            isInAttackRange(coordinate) ? "attack-range" : "",
            isSelected ? "selected" : "",
            marker?.type === "miss" ? "miss" : "",
            marker?.type === "hit" ? "hit" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={`${coordinate.x}-${coordinate.y}`}
              className={cellClasses}
              disabled={disableInteraction || !inBounds(coordinate)}
              onClick={() => handleCellClick(coordinate)}
            >
              {isSelected && "YOU"}
              {isDestroyed && "DEST"}
              {marker?.type === "miss" && "X"}
            </button>
          );
        })}
      </div>

      <div className="inline" style={{ flexWrap: "wrap", gap: 12 }}>
        <span className="tag">Move Range: {selectedVehicle.movementRange}</span>
        <span className="tag">Attack Range: {selectedVehicle.attackRange}</span>
        {player.cooldown > 0 && <span className="tag">Cooldown: {player.cooldown}</span>}
      </div>
    </div>
  );
}
