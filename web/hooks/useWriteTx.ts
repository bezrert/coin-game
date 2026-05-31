"use client";

import { useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

/**
 * Тонкая обёртка над нативными хуками wagmi (§12.C — без try/catch):
 * отправка транзакции + ожидание подтверждения. После подтверждения зовёт
 * onConfirmed — обычно шов useCasinoSync, который инвалидирует затронутые чтения.
 */
export function useWriteTx(onConfirmed?: () => void) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // ref, чтобы эффект срабатывал один раз на подтверждение, а не на смену колбэка;
  // актуализируем ref в эффекте (не в рендере), чтобы не мутировать ref при рендере
  const onConfirmedRef = useRef(onConfirmed);
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  });
  useEffect(() => {
    if (isConfirmed) onConfirmedRef.current?.();
  }, [isConfirmed]);

  return { writeContract, hash, isPending, isConfirming, isConfirmed, error, reset };
}
