import { VanguardHubContract } from "../../bindings/vanguard_hub";

const HUB_CONTRACT_ID = process.env.NEXT_PUBLIC_HUB_CONTRACT_ID ?? "";
const VERIFIER_CONTRACT_ID = process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID ?? "";

export function getHubClient() {
  if (!HUB_CONTRACT_ID) {
    throw new Error("Missing NEXT_PUBLIC_HUB_CONTRACT_ID");
  }
  return new VanguardHubContract(HUB_CONTRACT_ID);
}

export function getVerifierId() {
  if (!VERIFIER_CONTRACT_ID) {
    throw new Error("Missing NEXT_PUBLIC_VERIFIER_CONTRACT_ID");
  }
  return VERIFIER_CONTRACT_ID;
}
