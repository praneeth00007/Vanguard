import { Contract, xdr, StrKey } from "soroban-client";

// NOTE: Update contract IDs + network details in environment variables.
const HUB_CONTRACT_ID = process.env.NEXT_PUBLIC_HUB_CONTRACT_ID ?? "";

export type ProofPayload = {
  proof: Uint8Array;
  publicInputs: Uint8Array[];
};

export function getHubContract() {
  if (!HUB_CONTRACT_ID) {
    throw new Error("Missing NEXT_PUBLIC_HUB_CONTRACT_ID");
  }
  return new Contract(HUB_CONTRACT_ID);
}

export function toBytes32(hex: string): Uint8Array {
  const normalized = hex.replace(/^0x/, "");
  if (normalized.length !== 64) {
    throw new Error("Expected 32-byte hex");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function addressToScVal(address: string) {
  return xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(StrKey.decodeEd25519PublicKey(address)));
}
