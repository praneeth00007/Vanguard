import { VanguardHubContract } from "../../bindings/vanguard_hub";

const HUB_CONTRACT_ID = process.env.NEXT_PUBLIC_HUB_CONTRACT_ID ?? "";
const MOVEMENT_VERIFIER_ID = process.env.NEXT_PUBLIC_VERIFIER_MOVEMENT_ID ?? "";
const ATTACK_VERIFIER_ID = process.env.NEXT_PUBLIC_VERIFIER_ATTACK_ID ?? "";
const SCAN_VERIFIER_ID = process.env.NEXT_PUBLIC_VERIFIER_SCAN_ID ?? "";

export function getHubClient() {
  if (!HUB_CONTRACT_ID) {
    throw new Error("Missing NEXT_PUBLIC_HUB_CONTRACT_ID");
  }
  return new VanguardHubContract(HUB_CONTRACT_ID);
}

export function getMovementVerifierId() {
  if (!MOVEMENT_VERIFIER_ID) {
    throw new Error("Missing NEXT_PUBLIC_VERIFIER_MOVEMENT_ID");
  }
  return MOVEMENT_VERIFIER_ID;
}

export function getAttackVerifierId() {
  if (!ATTACK_VERIFIER_ID) {
    throw new Error("Missing NEXT_PUBLIC_VERIFIER_ATTACK_ID");
  }
  return ATTACK_VERIFIER_ID;
}

export function getScanVerifierId() {
  if (!SCAN_VERIFIER_ID) {
    throw new Error("Missing NEXT_PUBLIC_VERIFIER_SCAN_ID");
  }
  return SCAN_VERIFIER_ID;
}
