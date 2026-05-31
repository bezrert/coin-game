"use client";

import { useReadContract } from "wagmi";
import { casino } from "@/lib/contracts";

/**
 * Публичные параметры казино on-chain в одном модуле: лимиты ставки, коэффициент
 * выплаты (edge) и банкролл. Параллель usePlayerLedger — прячет address/abi/args.
 * houseBalance меняется на каждой ставке, потому refetch обновляет его после resolve.
 */
export function useCasinoParams() {
  const minBet = useReadContract({ ...casino, functionName: "minBet" });
  const maxBet = useReadContract({ ...casino, functionName: "maxBet" });
  const payoutBps = useReadContract({ ...casino, functionName: "payoutBps" });
  const houseBalance = useReadContract({ ...casino, functionName: "houseBalance" });

  const refetch = async () => {
    await houseBalance.refetch();
  };

  return {
    minBet: minBet.data,
    maxBet: maxBet.data,
    payoutBps: payoutBps.data,
    houseBalance: houseBalance.data,
    refetch,
  };
}
