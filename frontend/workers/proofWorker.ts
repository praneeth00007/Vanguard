import { Noir, CompiledCircuit } from "@noir-lang/noir_js";

export type CircuitType = "movement" | "attack" | "scan";

export type ProofRequest = {
  circuit: CircuitType;
  input: Record<string, string | number | boolean>;
};

export type ProofResponse =
  | { witness: Uint8Array; returnValue: unknown; circuit: CircuitType }
  | { error: string };

const CIRCUIT_ENDPOINTS: Record<CircuitType, string> = {
  movement: "/circuits/movement.json",
  attack: "/circuits/attack.json",
  scan: "/circuits/scan.json",
};

self.onmessage = async (event: MessageEvent<ProofRequest>) => {
  const { circuit, input } = event.data;

  try {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid input: expected an object with private and public inputs");
    }

    if (!("turn_counter" in input)) {
      throw new Error("Missing turn_counter in public inputs");
    }

    const turnCounter = input.turn_counter;
    if (typeof turnCounter !== "number" && typeof turnCounter !== "string") {
      throw new Error("turn_counter must be a number or string");
    }

    const circuitUrl = CIRCUIT_ENDPOINTS[circuit];
    if (!circuitUrl) {
      throw new Error(`Unknown circuit type: ${circuit}`);
    }

    const response = await fetch(circuitUrl);
    if (!response.ok) {
      throw new Error(`Failed to load circuit "${circuit}": ${response.status} ${response.statusText}`);
    }

    const circuitData: CompiledCircuit = await response.json();
    const noir = new Noir(circuitData);
    await noir.init();

    const executionResult = await noir.execute(input);

    const responseData: ProofResponse = {
      witness: executionResult.witness,
      returnValue: executionResult.returnValue,
      circuit,
    };

    self.postMessage(responseData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proof generation error";
    const errorResponse: ProofResponse = { error: message };
    self.postMessage(errorResponse);
  }
};
