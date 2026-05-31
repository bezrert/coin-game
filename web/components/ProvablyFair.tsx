"use client";

import { CONTRACTS, explorerAddress } from "@/lib/config";
import { houseEdgePercent, payoutMultiplier } from "@/lib/payout";
import { useCasinoParams } from "@/hooks/useCasinoParams";

/**
 * Блок «честность проверяема»: edge публичен и виден, плюс инструкция, как
 * вручную пересчитать исход по событиям, и ссылки на верифицированные контракты.
 */
export function ProvablyFair() {
  const { payoutBps } = useCasinoParams();
  const edge = payoutBps !== undefined ? houseEdgePercent(payoutBps).toFixed(1) : "—";
  const multiplier = payoutBps !== undefined ? payoutMultiplier(payoutBps).toFixed(2) : "—";

  return (
    <section className="casino-card flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Честность проверяема</h2>
        <span className="text-xs text-foreground/50">provably fair</span>
      </div>

      <p className="text-sm text-foreground/70">
        Случайность даёт Chainlink VRF v2.5 — казино не может её подкрутить. Вероятность
        честные 50/50; преимущество казино зашито только в коэффициент выплаты{" "}
        <span className="font-mono text-foreground">payoutBps</span>, который публичен.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <div className="text-xs uppercase tracking-wide text-neon-cyan/80">Выплата</div>
          <div className="mt-1 font-mono text-lg">×{multiplier}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <div className="text-xs uppercase tracking-wide text-neon-magenta/80">House edge</div>
          <div className="mt-1 font-mono text-lg">{edge}%</div>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-foreground/50">
          Как перепроверить на Etherscan
        </div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground/70">
          <li>
            Событие <span className="font-mono">BetPlaced</span> — ваша ставка и{" "}
            <span className="font-mono">requestId</span>.
          </li>
          <li>Транзакция-исполнение от официального VRF Coordinator со случайным числом.</li>
          <li>
            Событие <span className="font-mono">BetSettled</span> — пересчитайте сами:{" "}
            <span className="font-mono">outcome = randomWord % 2</span>, выплата ={" "}
            <span className="font-mono">amount × payoutBps / 10000</span>.
          </li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a
          href={explorerAddress(CONTRACTS.casino)}
          target="_blank"
          rel="noreferrer"
          className="text-neon-cyan underline underline-offset-2"
        >
          Контракт Casino ↗
        </a>
        <a
          href={explorerAddress(CONTRACTS.chip)}
          target="_blank"
          rel="noreferrer"
          className="text-neon-cyan underline underline-offset-2"
        >
          Токен CHIP ↗
        </a>
      </div>
    </section>
  );
}
