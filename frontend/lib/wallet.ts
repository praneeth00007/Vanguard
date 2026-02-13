import { getPublicKey, isConnected, requestAccess } from "@stellar/freighter-api";

export async function connectWallet(): Promise<string> {
  const connected = await isConnected();
  if (!connected) {
    await requestAccess();
  }
  return getPublicKey();
}
