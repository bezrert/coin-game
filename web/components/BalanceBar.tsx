"use client";

import { useAccount } from "wagmi";
import { formatChip } from "@/lib/format";
import { usePlayerLedger } from "@/hooks/usePlayerLedger";

/** Полоса балансов: CHIP в кошельке и CHIP внутри казино. */
export function BalanceBar() {
  const { isConnected } = useAccount();
  const { walletChip, casinoChip } = usePlayerLedger();

  if (!isConnected) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="casino-card px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-neon-cyan/80">
          CHIP в кошельке
        </div>
        <div className="mt-1 font-mono text-xl">{formatChip(walletChip)}</div>
      </div>
      <div className="casino-card px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-neon-magenta/80">
          CHIP в казино
        </div>
        <div className="mt-1 font-mono text-xl">{formatChip(casinoChip)}</div>
      </div>
    </div>
  );
}
