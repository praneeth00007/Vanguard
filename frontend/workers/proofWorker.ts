import { generateProof } from "@noir-lang/noir_js";

export type ProofRequest = {
  circuit: "movement" | "attack" | "scan";
  input: Record<string, unknown>;
};

const CIRCUIT_ENDPOINTS: Record<string, string> = {
  movement: "/circuits/movement.json",
  attack: "/circuits/attack.json",
  scan: "/circuits/scan.json",
};

self.onmessage = async (event: MessageEvent<ProofRequest>) => {
  const { circuit, input } = event.data;

  try {
    if (!input || !("turn_counter" in input)) {
      throw new Error("Missing turn_counter in public inputs");
    }

    const response = await fetch(CIRCUIT_ENDPOINTS[circuit]);
    if (!response.ok) {
      throw new Error(`Unable to load circuit: ${circuit}`);
    }

    const circuitData = await response.json();
    const proof = await generateProof(circuitData, input);
    self.postMessage({ proof: proof.proof, publicInputs: proof.publicInputs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proof error";
    self.postMessage({ error: message });
  }
};
