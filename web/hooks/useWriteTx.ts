"use client";

import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

/**
 * Тонкая обёртка над нативными хуками wagmi (§12.C — без try/catch):
 * отправка транзакции + ожидание подтверждения. После подтверждения зовёт
 * onConfirmed — вызывающий обновляет ровно то, что транзакция затронула
 * (обычно ledger.refetch), без слепого сноса всего кэша.
 */
export function useWriteTx(onConfirmed?: () => void) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // ref, чтобы эффект срабатывал один раз на подтверждение, а не на смену колбэка
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;
  useEffect(() => {
    if (isConfirmed) onConfirmedRef.current?.();
  }, [isConfirmed]);

  return { writeContract, hash, isPending, isConfirming, isConfirmed, error, reset };
}
