import { generateProof } from "@noir-lang/noir_js";

export type ProofRequest = {
  circuit: "movement" | "attack";
  input: Record<string, unknown>;
};

const CIRCUIT_ENDPOINTS: Record<string, string> = {
  movement: "/circuits/movement.json",
  attack: "/circuits/attack.json",
};

self.onmessage = async (event: MessageEvent<ProofRequest>) => {
  const { circuit, input } = event.data;

  try {
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
