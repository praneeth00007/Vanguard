import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Vanguard's Blindside",
  description: "ZK fog-of-war strategy game on Soroban",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
