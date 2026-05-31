"use client";

import { useAccount, useReadContract } from "wagmi";
import { chip } from "@/lib/contracts";
import { formatChip, formatDuration } from "@/lib/format";
import { useWriteTx } from "@/hooks/useWriteTx";
import { usePlayerLedger } from "@/hooks/usePlayerLedger";
import { useNow } from "@/hooks/useNow";
import { TxStatus } from "./TxStatus";

/** Кран CHIP: выдаёт фиксированную сумму с кулдауном на адрес. */
export function FaucetCard() {
  const { address, isConnected } = useAccount();
  const ledger = usePlayerLedger();
  const now = useNow();

  const lastClaimRead = useReadContract({
    ...chip,
    functionName: "lastClaim",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: cooldown } = useReadContract({ ...chip, functionName: "FAUCET_COOLDOWN" });
  const { data: amount } = useReadContract({ ...chip, functionName: "FAUCET_AMOUNT" });

  // после выдачи обновляем баланс кошелька (ledger) и время последней выдачи
  const tx = useWriteTx(() => {
    void ledger.refetch();
    void lastClaimRead.refetch();
  });

  if (!isConnected) return null;

  const lastClaim = lastClaimRead.data;
  const availableAt = lastClaim && cooldown ? Number(lastClaim) + Number(cooldown) : 0;
  const remaining = Math.max(0, availableAt - now);
  const onCooldown = Boolean(lastClaim && Number(lastClaim) > 0 && remaining > 0);
  const busy = tx.isPending || tx.isConfirming;

  return (
    <section className="casino-card flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Кран CHIP</h2>
        <span className="text-xs text-foreground/50">тестовые токены</span>
      </div>
      <p className="text-sm text-foreground/60">
        Получи {formatChip(amount)} CHIP бесплатно. Повторно — раз в{" "}
        {cooldown ? formatDuration(Number(cooldown)) : "—"}.
      </p>
      <button
        type="button"
        disabled={onCooldown || busy}
        onClick={() => tx.writeContract({ ...chip, functionName: "faucet" })}
        className="rounded-lg bg-neon-cyan px-4 py-2 font-medium text-[#04121a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {onCooldown
          ? `Доступно через ${formatDuration(remaining)}`
          : busy
            ? "Получаем…"
            : "Получить CHIP"}
      </button>
      <TxStatus {...tx} successLabel="CHIP получены" />
    </section>
  );
}
