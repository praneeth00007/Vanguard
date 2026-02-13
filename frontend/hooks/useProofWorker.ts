"use client";

import { useCallback, useMemo, useState } from "react";

type ProofWorkerMessage = {
  circuit: "movement" | "attack" | "scan";
  input: Record<string, unknown>;
};

type ProofWorkerResponse =
  | { proof: Uint8Array; publicInputs: Uint8Array[] }
  | { error: string };

export function useProofWorker() {
  const [isBusy, setIsBusy] = useState(false);

  const worker = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new Worker(new URL("../workers/proofWorker.ts", import.meta.url));
  }, []);

  const generateProof = useCallback(
    (message: ProofWorkerMessage) =>
      new Promise<ProofWorkerResponse>((resolve, reject) => {
        if (!worker) {
          reject(new Error("Worker not available"));
          return;
        }

        setIsBusy(true);

        worker.onmessage = (event: MessageEvent<ProofWorkerResponse>) => {
          setIsBusy(false);
          if ("error" in event.data) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        };

        worker.onerror = (event) => {
          setIsBusy(false);
          reject(event.error ?? new Error("Worker error"));
        };

        worker.postMessage(message);
      }),
    [worker]
  );

  return { generateProof, isBusy };
}
