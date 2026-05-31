"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseChip, formatChip, shortError } from "@/lib/format";
import { quotePayout, payoutMultiplier } from "@/lib/payout";
import { explorerTx } from "@/lib/config";
import { usePlayerLedger } from "@/hooks/usePlayerLedger";
import { useCasinoParams } from "@/hooks/useCasinoParams";
import { useCoinflip } from "@/hooks/useCoinflip";
import { AmountInput } from "./AmountInput";

const SIDES = [
  { value: 0 as const, label: "Орёл", face: "О" },
  { value: 1 as const, label: "Решка", face: "Р" },
];

/** Coinflip: ставка → ожидание VRF → результат. Логика жизненного цикла в useCoinflip. */
export function CoinflipGame() {
  const { isConnected } = useAccount();
  const [choice, setChoice] = useState<0 | 1>(0);
  const [amount, setAmount] = useState("");

  const ledger = usePlayerLedger();
  const params = useCasinoParams();
  const game = useCoinflip(() => {
    void ledger.refetch();
    void params.refetch();
  });

  if (!isConnected) return null;

  const parsed = parseChip(amount);
  const { minBet, maxBet, payoutBps, houseBalance } = params;

  const quote =
    parsed !== null && payoutBps !== undefined ? quotePayout(parsed, payoutBps) : null;
  const potentialWin = quote?.potentialWin ?? null;
  const housePayout = quote?.housePayout ?? null;
  const multiplier =
    payoutBps !== undefined ? payoutMultiplier(payoutBps).toFixed(2) : "—";

  // Пре-валидация для UX; контракт всё равно проверит те же условия (§12.C).
  let disabledReason: string | null = null;
  if (parsed === null) disabledReason = "Введите сумму";
  else if (minBet !== undefined && parsed < minBet)
    disabledReason = `Минимум ${formatChip(minBet)} CHIP`;
  else if (maxBet !== undefined && parsed > maxBet)
    disabledReason = `Максимум ${formatChip(maxBet)} CHIP`;
  else if (ledger.casinoChip !== undefined && parsed > ledger.casinoChip)
    disabledReason = "Не хватает CHIP в казино — внесите депозит";
  else if (
    housePayout !== null &&
    houseBalance !== undefined &&
    housePayout > houseBalance
  )
    disabledReason = "Банкролл казино мал для такой ставки";

  const busy = game.phase === "placing" || game.phase === "waiting";

  // --- результат ---
  if (game.phase === "settled" && game.result) {
    const { win, outcome, payout, settleTxHash } = game.result;
    const side = SIDES[outcome];
    return (
      <section className="casino-card flex flex-col items-center gap-4 p-6 text-center">
        <div className="coin" aria-hidden>
          {side.face}
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${win ? "text-emerald-400" : "text-red-400"}`}>
            {win ? "Победа!" : "Не повезло"}
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            Выпало: {side.label}
            {win ? ` · +${formatChip(payout)} CHIP` : ""}
          </p>
        </div>
        <a
          href={explorerTx(settleTxHash)}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-neon-cyan underline underline-offset-2"
        >
          Посмотреть resolve на Etherscan
        </a>
        <button
          type="button"
          onClick={game.reset}
          className="rounded-lg bg-neon-cyan px-6 py-2 font-medium text-[#04121a] transition hover:brightness-110"
        >
          Сыграть ещё
        </button>
      </section>
    );
  }

  // --- ожидание VRF ---
  if (game.phase === "waiting") {
    return (
      <section className="casino-card flex flex-col items-center gap-4 p-6 text-center">
        <div className="coin coin-spin" aria-hidden>
          ?
        </div>
        <div>
          <h2 className="font-semibold">Ждём Chainlink VRF…</h2>
          <p className="mt-1 max-w-sm text-sm text-foreground/60">
            Результат придёт второй транзакцией от Chainlink (обычно 30–60с).
            {game.isSlow
              ? " Иногда дольше — ждём подтверждения, страница не зависла."
              : ""}
          </p>
        </div>
        {game.betTxHash ? (
          <a
            href={explorerTx(game.betTxHash)}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-neon-cyan underline underline-offset-2"
          >
            Транзакция ставки на Etherscan
          </a>
        ) : null}
      </section>
    );
  }

  // --- форма ставки (idle / placing) ---
  return (
    <section className="casino-card flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Coinflip</h2>
        <span className="text-xs text-foreground/50">выплата ×{multiplier}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SIDES.map((side) => (
          <button
            key={side.value}
            type="button"
            disabled={busy}
            onClick={() => setChoice(side.value)}
            className={`rounded-lg border px-4 py-3 font-medium transition disabled:opacity-50 ${
              choice === side.value
                ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                : "border-white/15 hover:bg-white/5"
            }`}
          >
            {side.face} {side.label}
          </button>
        ))}
      </div>

      <AmountInput value={amount} onChange={setAmount} disabled={busy} />

      {potentialWin !== null ? (
        <p className="text-sm text-foreground/60">
          Возможный выигрыш:{" "}
          <span className="font-mono text-foreground">{formatChip(potentialWin)} CHIP</span>
        </p>
      ) : null}

      <button
        type="button"
        disabled={disabledReason !== null || busy}
        onClick={() => game.placeBet(choice, parsed!)}
        className="rounded-lg bg-neon-magenta px-4 py-2 font-medium text-[#1a041a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {game.phase === "placing" ? "Отправляем ставку…" : "Сделать ставку"}
      </button>

      {disabledReason && parsed !== null ? (
        <p className="text-sm text-amber-400">{disabledReason}</p>
      ) : null}
      {game.error ? <p className="text-sm text-red-400">{shortError(game.error)}</p> : null}
    </section>
  );
}
