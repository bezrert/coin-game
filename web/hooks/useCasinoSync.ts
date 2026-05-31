"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Единственный шов инвалидации on-chain чтений. После любой денежной транзакции
 * (ставка, депозит, вывод, кран) вызывающий говорит лишь «деньги изменились» —
 * решение, какие чтения протухли, живёт здесь, а не размазано по компонентам.
 *
 * Все чтения wagmi кэшируются react-query под ключом ['readContract', …]; одна
 * инвалидация этого префикса помечает их устаревшими, и react-query перечитывает
 * только смонтированные наблюдатели. Статичные minBet/maxBet тоже перечитаются —
 * это лишний дешёвый eth_call, которым меняем на отсутствие ручного refetch в UI.
 */
export function useCasinoSync() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [queryClient]);
}
