"use client";

import { useCallback, useMemo, useState } from "react";
import type { CircuitType, ProofRequest, ProofResponse } from "@/workers/proofWorker";

export type { CircuitType, ProofRequest, ProofResponse };

export function useProofWorker() {
  const [isBusy, setIsBusy] = useState(false);

  const worker = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new Worker(new URL("../workers/proofWorker.ts", import.meta.url));
  }, []);

  const executeCircuit = useCallback(
    (message: ProofRequest) =>
      new Promise<ProofResponse>((resolve, reject) => {
        if (!worker) {
          reject(new Error("Worker not available"));
          return;
        }

        setIsBusy(true);

        worker.onmessage = (event: MessageEvent<ProofResponse>) => {
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

  return { executeCircuit, isBusy };
}
