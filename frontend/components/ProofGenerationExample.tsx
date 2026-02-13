/**
 * Example component demonstrating proof generation for Vanguard Blindside
 *
 * This shows how to:
 * 1. Use the useProofWorker hook
 * 2. Generate movement, attack, and scan proofs
 * 3. Handle proof generation state
 * 4. Submit proofs to the blockchain (placeholder)
 */

"use client";

import React, { useState } from "react";
import {
  useProofWorker,
  createMovementInput,
  createAttackInput,
  createScanInput,
  ProofGenerationStatus,
} from "@/lib/proofWorkerHelper";

export default function ProofGenerationExample() {
  const { generateProof, result, isGenerating, reset } = useProofWorker();
  const [logs, setLogs] = useState<string[]>([]);

  // Add a log message
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Example: Generate a movement proof
  const handleMoveProof = async () => {
    try {
      addLog("Starting movement proof generation...");

      // Example private inputs (never sent to chain)
      const oldX = 3;
      const oldY = 5;
      const newX = 4;
      const newY = 6;
      const salt = "12345"; // In production, this would be a 32-byte hex string

      // Compute commitments (use a compatible Poseidon hash)
      // This is a placeholder - in production, use actual Poseidon hashing
      const oldHash = "0x" + "1".repeat(64); // Placeholder
      const newHash = "0x" + "2".repeat(64); // Placeholder

      // Vehicle type: 0 = Cycle, 1 = Scout, 2 = Heavy
      const vehicleType = 0; // Cycle
      const turnCounter = 1;

      // Create the input object
      const input = createMovementInput({
        oldX,
        oldY,
        newX,
        newY,
        salt,
        oldHash,
        newHash,
        vehicleType,
        turnCounter,
      });

      addLog("Sending proof request to worker...");
      const { proof, publicInputs } = await generateProof("movement", input);

      addLog(`✓ Movement proof generated!`);
      addLog(`  Proof size: ${proof.length} bytes`);
      addLog(`  Public inputs: ${publicInputs.length} bytes`);
      addLog(`  Proof hex: ${Array.from(proof.slice(0, 8)).map((b) => b.toString(16).padStart(2, "0")).join("")}...`);

      // In production, submit to Soroban:
      // await hubContract.move({ proof, public_inputs: publicInputs, new_hash: newHash });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addLog(`✗ Movement proof failed: ${message}`);
      console.error("Movement proof error:", error);
    }
  };

  // Example: Generate an attack proof
  const handleAttackProof = async () => {
    try {
      addLog("Starting attack proof generation...");

      // Attacker's private inputs
      const attackerX = 3;
      const attackerY = 5;
      const attackerSalt = "attacker_salt";
      const attackerHash = "0x" + "1".repeat(64); // Placeholder commitment

      // Defender's private inputs
      const defenderX = 7;
      const defenderY = 2;
      const defenderSalt = "defender_salt";
      const defenderHash = "0x" + "3".repeat(64); // Placeholder commitment

      // Target coordinates (where attacker is aiming)
      const targetX = 7;
      const targetY = 2;

      // Hit determination (defender is at target, so this is a hit)
      const claimedHit = defenderX === targetX && defenderY === targetY;

      const vehicleType = 1; // Scout
      const turnCounter = 2;

      const input = createAttackInput({
        attackerX,
        attackerY,
        attackerSalt,
        attackerHash,
        defenderX,
        defenderY,
        defenderSalt,
        defenderHash,
        targetX,
        targetY,
        vehicleType,
        turnCounter,
        claimedHit,
      });

      addLog("Sending proof request to worker...");
      const { proof, publicInputs } = await generateProof("attack", input);

      addLog(`✓ Attack proof generated!`);
      addLog(`  Proof size: ${proof.length} bytes`);
      addLog(`  Public inputs: ${publicInputs.length} bytes`);
      addLog(`  Claimed hit: ${claimedHit}`);

      // In production, submit to Soroban:
      // await hubContract.attack({ proof, public_inputs: publicInputs, claimed_hit: claimedHit });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addLog(`✗ Attack proof failed: ${message}`);
      console.error("Attack proof error:", error);
    }
  };

  // Example: Generate a scan proof
  const handleScanProof = async () => {
    try {
      addLog("Starting scan proof generation...");

      // Scanner's private inputs
      const scannerX = 3;
      const scannerY = 5;
      const scannerSalt = "scanner_salt";
      const scannerHash = "0x" + "1".repeat(64);

      // Defender's private inputs
      const defenderX = 7;
      const defenderY = 2;
      const defenderSalt = "defender_salt";
      const defenderHash = "0x" + "3".repeat(64);

      // Scan area (top-left of 2x2 area)
      const scanX = 6;
      const scanY = 1;

      // Check if defender is in the scanned 2x2 area
      const inX = defenderX >= scanX && defenderX <= scanX + 1;
      const inY = defenderY >= scanY && defenderY <= scanY + 1;
      const claimedScanHit = inX && inY;

      const vehicleType = 0; // Only Cycle can scan
      const turnCounter = 3;

      const input = createScanInput({
        scannerX,
        scannerY,
        scannerSalt,
        scannerHash,
        defenderX,
        defenderY,
        defenderSalt,
        defenderHash,
        scanX,
        scanY,
        vehicleType,
        turnCounter,
        claimedScanHit,
      });

      addLog("Sending proof request to worker...");
      const { proof, publicInputs } = await generateProof("scan", input);

      addLog(`✓ Scan proof generated!`);
      addLog(`  Proof size: ${proof.length} bytes`);
      addLog(`  Public inputs: ${publicInputs.length} bytes`);
      addLog(`  Scan area: (${scanX}, ${scanY}) to (${scanX + 1}, ${scanY + 1})`);
      addLog(`  Detected defender: ${claimedScanHit}`);

      // In production, submit to Soroban:
      // await hubContract.scan({ proof, public_inputs: publicInputs, scan_hit: claimedScanHit });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addLog(`✗ Scan proof failed: ${message}`);
      console.error("Scan proof error:", error);
    }
  };

  const getStatusBadge = () => {
    switch (result.status) {
      case "idle":
        return <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm">Idle</span>;
      case "generating":
        return <span className="px-2 py-1 bg-blue-500 text-white rounded text-sm animate-pulse">Generating...</span>;
      case "success":
        return <span className="px-2 py-1 bg-green-500 text-white rounded text-sm">✓ Success</span>;
      case "error":
        return <span className="px-2 py-1 bg-red-500 text-white rounded text-sm">✗ Error</span>;
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Proof Generation Example</h2>

      <div className="mb-4 flex items-center gap-2">
        <span className="font-semibold">Status:</span>
        {getStatusBadge()}
        {isGenerating && <span className="text-sm text-gray-500">(Proof generation in worker thread - UI remains responsive)</span>}
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={handleMoveProof}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Generate Move Proof
        </button>
        <button
          onClick={handleAttackProof}
          disabled={isGenerating}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Generate Attack Proof
        </button>
        <button
          onClick={handleScanProof}
          disabled={isGenerating}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Generate Scan Proof
        </button>
        <button
          onClick={reset}
          disabled={isGenerating}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {result.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="font-semibold text-red-800">Error:</p>
          <p className="text-red-700">{result.error}</p>
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Event Log:</h3>
        <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm h-64 overflow-y-auto">
          {logs.length === 0 ? <p className="text-gray-500">No events yet...</p> : null}
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600 space-y-2">
        <h3 className="font-semibold text-gray-800">Security Notes:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Private inputs (coordinates, salt) are NEVER sent to the blockchain</li>
          <li>Only the ZK proof and public inputs (hashes, turn_counter) are submitted on-chain</li>
          <li>The proof generation happens in a Web Worker, keeping the UI responsive</li>
          <li>turn_counter is included in public inputs for replay protection</li>
          <li>Old proofs cannot be reused due to turn_counter validation</li>
        </ul>
      </div>
    </div>
  );
}
