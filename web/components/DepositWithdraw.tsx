"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { maxUint256 } from "viem";
import { chip, casino } from "@/lib/contracts";
import { parseChip } from "@/lib/format";
import { useWriteTx } from "@/hooks/useWriteTx";
import { usePlayerLedger } from "@/hooks/usePlayerLedger";
import { useCasinoSync } from "@/hooks/useCasinoSync";
import { TxStatus } from "./TxStatus";
import { AmountInput } from "./AmountInput";

/** Депозит/вывод CHIP: разовый approve → deposit, и withdraw. */
export function DepositWithdraw() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const ledger = usePlayerLedger();
  const sync = useCasinoSync();
  const tx = useWriteTx(sync);

  if (!isConnected) return null;

  const parsed = parseChip(amount);
  const busy = tx.isPending || tx.isConfirming;
  const needsApproval =
    parsed !== null && ledger.allowance !== undefined && ledger.allowance < parsed;

  return (
    <section className="casino-card flex flex-col gap-3 p-4">
      <h2 className="font-semibold">Депозит / вывод</h2>
      <AmountInput value={amount} onChange={setAmount} disabled={busy} />

      {needsApproval ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            tx.writeContract({
              ...chip,
              functionName: "approve",
              args: [casino.address, maxUint256],
            })
          }
          className="rounded-lg bg-neon-magenta px-4 py-2 font-medium text-[#1a041a] transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Разрешаем…" : "Разрешить CHIP (однократно)"}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={parsed === null || busy}
            onClick={() =>
              tx.writeContract({ ...casino, functionName: "deposit", args: [parsed!] })
            }
            className="rounded-lg bg-neon-cyan px-4 py-2 font-medium text-[#04121a] transition hover:brightness-110 disabled:opacity-50"
          >
            Внести
          </button>
          <button
            type="button"
            disabled={parsed === null || busy}
            onClick={() =>
              tx.writeContract({ ...casino, functionName: "withdraw", args: [parsed!] })
            }
            className="rounded-lg border border-white/15 px-4 py-2 font-medium transition hover:bg-white/5 disabled:opacity-50"
          >
            Вывести
          </button>
        </div>
      )}

      <TxStatus {...tx} />
    </section>
  );
}
