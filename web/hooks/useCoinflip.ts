"use client";

import { useCallback, useMemo, useState } from "react";
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

export type CoinflipResult = {
  requestId: bigint;
  randomWord: bigint;
  outcome: number; // 0 = орёл, 1 = решка
  win: boolean;
  payout: bigint;
  settleTxHash: `0x${string}`; // tx от Chainlink — главная ссылка для проверки
};

export type CoinflipPhase = "idle" | "placing" | "waiting" | "settled";

/**
 * Жизненный цикл ставки coinflip (§12.E — игре свой seam, не форкаем useWriteTx):
 * tx игрока → requestId из чека (BetPlaced) → подписка на BetSettled от Chainlink.
 * Гонку «событие пришло раньше подписки» закрываем poll + fromBlock = блок ставки:
 * поллинг сканирует логи с блока placeBet, а не только вперёд.
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
  const now = useNow();

  // requestId выводим из чека placeBet (BetPlaced индексирует его) — чистая
  // производная от receipt, без эффекта и состояния (§5, §12.C).
  const placed = useMemo(() => {
    if (!receipt) return null;
    const logs = parseEventLogs({ abi: casinoAbi, eventName: "BetPlaced", logs: receipt.logs });
    const mine = logs.find((log) => log.args.player === address);
    return mine ? { requestId: mine.args.requestId, fromBlock: receipt.blockNumber } : null;
  }, [receipt, address]);

  const requestId = placed?.requestId ?? null;

  // второй tx от Chainlink: BetSettled по нашему requestId (индексирован → фильтр).
  // poll + fromBlock = блок ставки закрывают гонку «событие раньше подписки».
  useWatchContractEvent({
    ...casino,
    eventName: "BetSettled",
    args: requestId !== null ? { requestId } : undefined,
    enabled: requestId !== null && result === null,
    poll: true,
    fromBlock: placed?.fromBlock,
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
      onSettled?.();
    },
  });

  const placeBet = useCallback(
    (choice: 0 | 1, amount: bigint) => {
      // отметка начала ожидания ставится в обработчике (для индикатора «ещё ждём»)
      setWaitStart(Math.floor(Date.now() / 1000));
      writeContract({ ...casino, functionName: "placeBet", args: [choice, amount] });
    },
    [writeContract],
  );

  const reset = useCallback(() => {
    setResult(null);
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

  return { placeBet, reset, phase, result, betTxHash, error, isSlow };
}
