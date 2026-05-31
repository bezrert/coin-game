"use client";

import { useState } from "react";
import { CONTRACTS, explorerAddress } from "@/lib/config";
import { houseEdgePercent, payoutMultiplier } from "@/lib/payout";
import { useCasinoParams } from "@/hooks/useCasinoParams";

/**
 * Блок «честность проверяема»: понятный игроку текст о том, почему исход нельзя
 * подкрутить, плюс попап «Технические подробности» — формулы и шаги ручной
 * проверки на Etherscan для тех, кто хочет копнуть.
 */
export function ProvablyFair() {
  const { payoutBps } = useCasinoParams();
  const edge = payoutBps !== undefined ? houseEdgePercent(payoutBps).toFixed(1) : "—";
  const multiplier = payoutBps !== undefined ? payoutMultiplier(payoutBps).toFixed(2) : "—";
  const [open, setOpen] = useState(false);

  return (
    <section className="casino-card flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Честность проверяема</h2>
        <span className="text-xs text-foreground/50">provably fair</span>
      </div>

      <p className="text-sm leading-relaxed text-foreground/75">
        Здесь невозможно смухлевать. Исход каждого броска задаёт{" "}
        <span className="text-foreground">Chainlink VRF</span> — независимый источник
        случайности, который выдаёт число прямо в блокчейне. Ни казино, ни игрок, ни
        кто-либо ещё не может его предсказать или подменить. Шансы честные —{" "}
        <span className="text-foreground">50 на 50</span>. Единственное преимущество
        казино зашито в коэффициент выплаты (он открыт и показан ниже), а не в самом
        броске. Каждый бросок навсегда записан в блокчейне — любой можно перепроверить.
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

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-white/15 px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-white/5"
      >
        Технические подробности
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="casino-card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">Как устроена честность</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-foreground/50 transition hover:text-foreground"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <p className="text-sm leading-relaxed text-foreground/75">
              Когда вы делаете ставку, контракт запрашивает случайное число у Chainlink
              VRF. Coordinator отвечает второй транзакцией, в которой число приходит
              вместе с криптографическим доказательством — подделать его нельзя. Эта же
              транзакция и определяет исход.
            </p>

            <div className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-foreground/80">
              outcome = randomWord % 2
              <br />
              payout = amount × payoutBps / 10000
            </div>

            <div className="mt-4 text-xs uppercase tracking-wide text-foreground/50">
              Проверить вручную на Etherscan
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground/75">
              <li>
                Событие <span className="font-mono">BetPlaced</span> — ваша ставка и{" "}
                <span className="font-mono">requestId</span>.
              </li>
              <li>
                Транзакция-исполнение от официального VRF Coordinator со случайным
                числом.
              </li>
              <li>
                Событие <span className="font-mono">BetSettled</span> — пересчитайте сами
                по формулам выше и сверьте с выплатой.
              </li>
            </ol>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
          </div>
        </div>
      ) : null}
    </section>
  );
}
