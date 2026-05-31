"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import { parseEventLogs } from "viem";
import { casino } from "@/lib/contracts";
import { casinoAbi } from "@/lib/abi";
import { useNow } from "@/hooks/useNow";

/** Через сколько секунд ожидания VRF показываем «ещё ждём» (UI не виснет, §6). */
const SLOW_AFTER_SECONDS = 90;

/** Ключ localStorage для «висящей» ставки — переживает refresh (§6). */
const PENDING_KEY = "justflip:pending-bet";

export type CoinflipResult = {
  requestId: bigint;
  randomWord: bigint;
  outcome: number; // 0 = орёл, 1 = решка
  win: boolean;
  payout: bigint;
  settleTxHash: `0x${string}`; // tx от Chainlink — главная ссылка для проверки
};

export type CoinflipPhase = "idle" | "placing" | "waiting" | "settled";

/** Снапшот незавершённой ставки, который кладём в localStorage. */
type PendingBet = {
  requestId: string; // bigint сериализуем строкой
  fromBlock: string;
  betTxHash: `0x${string}`;
  placedAt: number; // сек, для индикатора «ещё ждём»
  address: string;
};

function readPending(): PendingBet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingBet) : null;
  } catch {
    return null;
  }
}

function writePending(bet: PendingBet) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(bet));
}

function clearPending() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
}

/**
 * Жизненный цикл ставки coinflip (§12.E — игре свой seam, не форкаем useWriteTx):
 * tx игрока → requestId из чека (BetPlaced) → подписка на BetSettled от Chainlink.
 * Гонку «событие пришло раньше подписки» закрываем poll + fromBlock = блок ставки.
 *
 * Незавершённая ставка дублируется в localStorage: после refresh состояние
 * восстанавливается (тот же requestId/fromBlock), и подписка на BetSettled
 * доигрывает результат — пользователь не теряет ставку из виду (§6).
 * @param onSettled колбэк после resolve (обновить ledger/params, не сносить весь кэш).
 */
export function useCoinflip(onSettled?: () => void) {
  const { address } = useAccount();
  const { writeContract, data: betTxHash, isPending, error, reset: resetWrite } =
    useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: betTxHash,
  });

  const [result, setResult] = useState<CoinflipResult | null>(null);
  const [waitStart, setWaitStart] = useState<number | null>(null);
  // ставка, восстановленная из localStorage при загрузке (для resume после refresh)
  const [restored, setRestored] = useState<PendingBet | null>(null);
  const now = useNow();

  // Восстановление при маунте: только если ставка той же учётки и ещё не resolved.
  useEffect(() => {
    if (!address || result !== null) return;
    const pending = readPending();
    if (pending && pending.address.toLowerCase() === address.toLowerCase()) {
      setRestored(pending);
      setWaitStart(pending.placedAt);
    }
  }, [address, result]);

  // requestId выводим из чека placeBet (BetPlaced индексирует его) — чистая
  // производная от receipt, без эффекта и состояния (§5, §12.C).
  const placed = useMemo(() => {
    if (!receipt) return null;
    const logs = parseEventLogs({ abi: casinoAbi, eventName: "BetPlaced", logs: receipt.logs });
    const mine = logs.find((log) => log.args.player === address);
    return mine ? { requestId: mine.args.requestId, fromBlock: receipt.blockNumber } : null;
  }, [receipt, address]);

  // requestId/fromBlock берём из живой ставки, иначе из восстановленной.
  const requestId = placed?.requestId ?? (restored ? BigInt(restored.requestId) : null);
  const fromBlock = placed?.fromBlock ?? (restored ? BigInt(restored.fromBlock) : undefined);
  // ссылка на tx ставки: из write-хука, либо сохранённая (после refresh write пуст).
  const effectiveBetTxHash = betTxHash ?? restored?.betTxHash;

  // Как только узнали requestId живой ставки — сохраняем снапшот в localStorage.
  useEffect(() => {
    if (placed && betTxHash && address && waitStart !== null) {
      writePending({
        requestId: placed.requestId.toString(),
        fromBlock: placed.fromBlock.toString(),
        betTxHash,
        placedAt: waitStart,
        address,
      });
    }
  }, [placed, betTxHash, address, waitStart]);

  // второй tx от Chainlink: BetSettled по нашему requestId (индексирован → фильтр).
  // poll + fromBlock = блок ставки закрывают гонку «событие раньше подписки».
  useWatchContractEvent({
    ...casino,
    eventName: "BetSettled",
    args: requestId !== null ? { requestId } : undefined,
    enabled: requestId !== null && result === null,
    poll: true,
    fromBlock,
    onLogs(logs) {
      const log = logs[0];
      if (!log) return;
      setResult({
        requestId: log.args.requestId!,
        randomWord: log.args.randomWord!,
        outcome: Number(log.args.outcome),
        win: Boolean(log.args.win),
        payout: log.args.payout!,
        settleTxHash: log.transactionHash,
      });
      clearPending(); // ставка разрешилась — снапшот больше не нужен
      onSettled?.();
    },
  });

  const placeBet = useCallback(
    (choice: 0 | 1, amount: bigint) => {
      // отметка начала ожидания ставится здесь (для индикатора «ещё ждём»)
      setWaitStart(Math.floor(Date.now() / 1000));
      writeContract({ ...casino, functionName: "placeBet", args: [choice, amount] });
    },
    [writeContract],
  );

  const reset = useCallback(() => {
    clearPending();
    setResult(null);
    setRestored(null);
    setWaitStart(null);
    resetWrite();
  }, [resetWrite]);

  const phase: CoinflipPhase =
    result !== null
      ? "settled"
      : requestId !== null
        ? "waiting"
        : isPending || isConfirming
          ? "placing"
          : "idle";

  const isSlow =
    phase === "waiting" && waitStart !== null && now - waitStart > SLOW_AFTER_SECONDS;

  return { placeBet, reset, phase, result, betTxHash: effectiveBetTxHash, error, isSlow };
}
