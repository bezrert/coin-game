"use client";

import { useAccount, useReadContract } from "wagmi";
import { chip, casino } from "@/lib/contracts";

/**
 * Финансовое состояние игрока on-chain в одном модуле: CHIP в кошельке,
 * CHIP внутри казино и allowance на казино. Прячет address/abi/args/enabled-guard;
 * `refetch` обновляет всё разом (общие react-query записи — обновляются и у других
 * наблюдателей того же ключа). Переиспользуется балансами, депозитом и игрой (этап 4).
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

  const refetch = async () => {
    await Promise.all([wallet.refetch(), inCasino.refetch(), allowance.refetch()]);
  };

  return {
    walletChip: wallet.data,
    casinoChip: inCasino.data,
    allowance: allowance.data,
    refetch,
  };
}
