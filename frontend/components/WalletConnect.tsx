"use client";

import { connectWallet } from "@/lib/wallet";
import { useGameStore } from "@/store/gameStore";

export default function WalletConnect() {
  const walletAddress = useGameStore((state) => state.walletAddress);
  const setWalletAddress = useGameStore((state) => state.setWalletAddress);

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
    } catch (error) {
      console.error(error);
      setWalletAddress(undefined);
    }
  };

  if (walletAddress) {
    return (
      <div className="status-pill">
        Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
      </div>
    );
  }

  return (
    <button className="button" onClick={handleConnect}>
      Connect Wallet
    </button>
  );
}
