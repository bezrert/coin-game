"use client";

import { explorerTx } from "@/lib/config";
import { shortError } from "@/lib/format";

type Props = {
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed?: boolean;
  hash?: `0x${string}`;
  error?: Error | null;
  /** Текст при успехе (по умолчанию «Готово»). */
  successLabel?: string;
};

/** Презентационная строка статуса транзакции: подпись/подтверждение/ошибка/успех. */
export function TxStatus({
  isPending,
  isConfirming,
  isConfirmed,
  hash,
  error,
  successLabel = "Готово",
}: Props) {
  if (error) {
    return <p className="text-sm text-red-400">{shortError(error)}</p>;
  }
  if (isPending) {
    return <p className="text-sm text-foreground/60">Подтвердите в кошельке…</p>;
  }
  if (isConfirming) {
    return <p className="text-sm text-foreground/60">Ждём подтверждения сети…</p>;
  }
  if (isConfirmed && hash) {
    return (
      <p className="text-sm text-emerald-400">
        {successLabel}.{" "}
        <a
          href={explorerTx(hash)}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Посмотреть на Etherscan
        </a>
      </p>
    );
  }
  return null;
}
