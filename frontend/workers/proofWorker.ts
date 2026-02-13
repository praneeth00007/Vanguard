import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@noir-lang/backend_barretenberg";

// Circuit type for all supported actions
export type CircuitType = "movement" | "attack" | "scan";

// Input types for each circuit
export type MovementInput = {
  // Private inputs (witnesses)
  old_x: number | string;
  old_y: number | string;
  new_x: number | string;
  new_y: number | string;
  salt: string;
  // Public inputs
  old_hash: string;
  new_hash: string;
  vehicle_type: number | string;
  action_type: number | string;
  turn_counter: number | string;
};

export type AttackInput = {
  // Private inputs (witnesses)
  attacker_x: number | string;
  attacker_y: number | string;
  attacker_salt: string;
  defender_x: number | string;
  defender_y: number | string;
  defender_salt: string;
  // Public inputs
  attacker_hash: string;
  defender_hash: string;
  target_x: number | string;
  target_y: number | string;
  vehicle_type: number | string;
  action_type: number | string;
  turn_counter: number | string;
  claimed_hit: boolean;
};

export type ScanInput = {
  // Private inputs (witnesses)
  scanner_x: number | string;
  scanner_y: number | string;
  scanner_salt: string;
  defender_x: number | string;
  defender_y: number | string;
  defender_salt: string;
  // Public inputs
  scanner_hash: string;
  defender_hash: string;
  scan_x: number | string;
  scan_y: number | string;
  vehicle_type: number | string;
  action_type: number | string;
  turn_counter: number | string;
  claimed_scan_hit: boolean;
};

export type ProofInput = MovementInput | AttackInput | ScanInput;

// Response type
export type ProofSuccessResponse = {
  success: true;
  proof: Uint8Array;
  publicInputs: Uint8Array;
  circuit: CircuitType;
};

export type ProofErrorResponse = {
  success: false;
  error: string;
  circuit: CircuitType;
};

export type ProofResponse = ProofSuccessResponse | ProofErrorResponse;

// Request type
export type ProofRequest = {
  circuit: CircuitType;
  input: ProofInput;
};

// Circuit endpoints - served from public folder
const CIRCUIT_ENDPOINTS: Record<CircuitType, string> = {
  movement: "/circuits/movement.json",
  attack: "/circuits/attack.json",
  scan: "/circuits/scan.json",
};

/**
 * Convert number inputs to strings for noir_js
 * noir_js expects all inputs as strings
 */
function normalizeInputs(input: ProofInput): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
   if (typeof value === "boolean") {
      normalized[key] = value ? "1" : "0";
    }else if (typeof value === "string") {
      normalized[key] = value;
    } else if (typeof value === "number") {
      normalized[key] = value.toString();
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

/**
 * Main worker message handler
 * Receives proof generation requests and returns proofs or errors
 */
self.onmessage = async (event: MessageEvent<ProofRequest>) => {
  const { circuit, input } = event.data;

  try {
    // Validate turn_counter exists (required for replay protection)
    if (!input || !("turn_counter" in input)) {
      throw new Error("Missing turn_counter in public inputs - required for replay protection");
    }

    // Load the compiled circuit JSON
    const circuitUrl = CIRCUIT_ENDPOINTS[circuit];
    const response = await fetch(circuitUrl);
    if (!response.ok) {
      throw new Error(`Unable to load circuit: ${circuit} from ${circuitUrl}`);
    }

    const circuitData = await response.json();

    // Initialize the Noir instance with UltraHonk backend
   const backend = new UltraHonkBackend(circuitData.bytecode);
   const noir = new Noir(circuitData, backend);
    await noir.init();

    const normalizedInput = normalizeInputs(input);

  const { proof, publicInputs } = await noir.generateProof(normalizedInput);

  const verification = await noir.verifyProof({ proof, publicInputs });
  if (!verification) {
    throw new Error("Generated proof failed local verification");
  }


    // Return success response with proof and public inputs
    // The proof contains only the zero-knowledge proof, NOT the salt or private inputs
    const successResponse: ProofSuccessResponse = {
      success: true,
      proof: proof instanceof Uint8Array ? proof : new Uint8Array(proof),
      publicInputs: publicInputs instanceof Uint8Array ? publicInputs : new Uint8Array(publicInputs),
      circuit,
    };

    self.postMessage(successResponse);
  } catch (error) {
    // Return error response
    const message = error instanceof Error ? error.message : "Unknown proof generation error";
    console.error(`[${circuit}] Proof generation error:`, error);

    const errorResponse: ProofErrorResponse = {
      success: false,
      error: message,
      circuit,
    };

    self.postMessage(errorResponse);
  }
};

// Export for TypeScript types (only works in module context)
export type { CircuitType, ProofRequest, ProofResponse };
