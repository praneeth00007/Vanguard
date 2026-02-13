import { useEffect, useRef, useState } from "react";
import {
  CircuitType,
  ProofInput,
  ProofRequest,
  ProofResponse,
  ProofSuccessResponse,
  ProofErrorResponse,
} from "@/workers/proofWorker";

export type ProofGenerationStatus = "idle" | "generating" | "success" | "error";

export interface ProofGenerationResult {
  status: ProofGenerationStatus;
  error: string | null;
  proof: Uint8Array | null;
  publicInputs: Uint8Array | null;
}

/**
 * Hook to generate ZK proofs using the Web Worker
 * Keeps proof generation off the main thread for non-blocking UI
 */
export function useProofWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<ProofGenerationResult>({
    status: "idle",
    error: null,
    proof: null,
    publicInputs: null,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize worker on mount
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("@/workers/proofWorker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (event: MessageEvent<ProofResponse>) => {
        const response = event.data;

        if (response.success) {
          // Proof generated successfully
          setResult({
            status: "success",
            error: null,
            proof: response.proof,
            publicInputs: response.publicInputs,
          });
          setIsGenerating(false);
        } else {
          // Error during proof generation
          setResult({
            status: "error",
            error: response.error,
            proof: null,
            publicInputs: null,
          });
          setIsGenerating(false);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error("Worker error:", error);
        setResult({
          status: "error",
          error: "Worker initialization failed",
          proof: null,
          publicInputs: null,
        });
        setIsGenerating(false);
      };
    } catch (error) {
      console.error("Failed to initialize proof worker:", error);
      setResult({
        status: "error",
        error: "Failed to initialize worker",
        proof: null,
        publicInputs: null,
      });
    }

    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  /**
   * Generate a proof for the specified circuit
   * @param circuit - The circuit type (movement, attack, or scan)
   * @param input - The input values (private + public inputs)
   * @returns Promise that resolves when proof is complete
   */
  const generateProof = async (
    circuit: CircuitType,
    input: ProofInput
  ): Promise<{ proof: Uint8Array; publicInputs: Uint8Array }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }

      // Set generating state
      setIsGenerating(true);
      setResult({
        status: "generating",
        error: null,
        proof: null,
        publicInputs: null,
      });

      // Set up one-time listener for this specific request
      const handler = (event: MessageEvent<ProofResponse>) => {
        const response = event.data;

        // Only process responses for this circuit
        if (response.circuit !== circuit) {
          return;
        }

        // Remove this listener
        workerRef.current?.removeEventListener("message", handler);

        if (response.success) {
          resolve({
            proof: response.proof,
            publicInputs: response.publicInputs,
          });
        } else {
          reject(new Error(response.error));
        }
      };

      workerRef.current.addEventListener("message", handler);

      // Send the proof generation request
      const request: ProofRequest = { circuit, input };
      workerRef.current.postMessage(request);
    });
  };

  /**
   * Reset the proof generation state
   */
  const reset = () => {
    setResult({
      status: "idle",
      error: null,
      proof: null,
      publicInputs: null,
    });
    setIsGenerating(false);
  };

  return {
    generateProof,
    result,
    isGenerating,
    reset,
  };
}

/**
 * Helper function to create a movement proof input
 */
export function createMovementInput(params: {
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
  salt: string;
  oldHash: string;
  newHash: string;
  vehicleType: number; // 0 = Cycle, 1 = Scout, 2 = Heavy
  turnCounter: number;
}): ProofInput {
  return {
    old_x: params.oldX,
    old_y: params.oldY,
    new_x: params.newX,
    new_y: params.newY,
    salt: params.salt,
    old_hash: params.oldHash,
    new_hash: params.newHash,
    vehicle_type: params.vehicleType,
    action_type: 0, // 0 = move
    turn_counter: params.turnCounter,
  };
}

/**
 * Helper function to create an attack proof input
 */
export function createAttackInput(params: {
  attackerX: number;
  attackerY: number;
  attackerSalt: string;
  attackerHash: string;
  defenderX: number;
  defenderY: number;
  defenderSalt: string;
  defenderHash: string;
  targetX: number;
  targetY: number;
  vehicleType: number; // 0 = Cycle, 1 = Scout, 2 = Heavy
  turnCounter: number;
  claimedHit: boolean;
}): ProofInput {
  return {
    attacker_x: params.attackerX,
    attacker_y: params.attackerY,
    attacker_salt: params.attackerSalt,
    attacker_hash: params.attackerHash,
    defender_x: params.defenderX,
    defender_y: params.defenderY,
    defender_salt: params.defenderSalt,
    defender_hash: params.defenderHash,
    target_x: params.targetX,
    target_y: params.targetY,
    vehicle_type: params.vehicleType,
    action_type: 1, // 1 = attack
    turn_counter: params.turnCounter,
    claimed_hit: params.claimedHit,
  };
}

/**
 * Helper function to create a scan proof input
 */
export function createScanInput(params: {
  scannerX: number;
  scannerY: number;
  scannerSalt: string;
  scannerHash: string;
  defenderX: number;
  defenderY: number;
  defenderSalt: string;
  defenderHash: string;
  scanX: number;
  scanY: number;
  vehicleType: number; // Only 0 (Cycle) can scan
  turnCounter: number;
  claimedScanHit: boolean;
}): ProofInput {
  return {
    scanner_x: params.scannerX,
    scanner_y: params.scannerY,
    scanner_salt: params.scannerSalt,
    scanner_hash: params.scannerHash,
    defender_x: params.defenderX,
    defender_y: params.defenderY,
    defender_salt: params.defenderSalt,
    defender_hash: params.defenderHash,
    scan_x: params.scanX,
    scan_y: params.scanY,
    vehicle_type: params.vehicleType,
    action_type: 2, // 2 = scan
    turn_counter: params.turnCounter,
    claimed_scan_hit: params.claimedScanHit,
  };
}
