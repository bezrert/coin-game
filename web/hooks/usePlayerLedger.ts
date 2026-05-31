"use client";

import { useAccount, useReadContract } from "wagmi";
import { chip, casino } from "@/lib/contracts";

/**
 * Финансовое состояние игрока on-chain в одном модуле: CHIP в кошельке,
 * CHIP внутри казино и allowance на казино. Прячет address/abi/args/enabled-guard.
 * Переиспользуется балансами, депозитом и игрой (этап 4). Обновление после tx —
 * через общий шов useCasinoSync (инвалидация по queryKey), не ручной refetch.
 */
export function usePlayerLedger() {
  const { address } = useAccount();
  const enabled = Boolean(address);

  const wallet = useReadContract({
    ...chip,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const inCasino = useReadContract({
    ...casino,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const allowance = useReadContract({
    ...chip,
    functionName: "allowance",
    args: address ? [address, casino.address] : undefined,
    query: { enabled },
  });

  return {
    walletChip: wallet.data,
    casinoChip: inCasino.data,
    allowance: allowance.data,
  };
}
