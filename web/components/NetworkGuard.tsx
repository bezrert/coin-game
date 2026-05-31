"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { CHAIN } from "@/lib/config";

/** Гард сети: если кошелёк подключён не к Sepolia, показывает баннер с переключателем. */
export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === CHAIN.id) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
      <span>Кошелёк подключён не к сети Sepolia. Переключитесь, чтобы играть.</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchChain({ chainId: CHAIN.id })}
        className="rounded-lg bg-amber-400 px-3 py-1.5 font-medium text-amber-950 transition hover:bg-amber-300 disabled:opacity-60"
      >
        {isPending ? "Переключаю…" : "Переключить на Sepolia"}
      </button>
    </div>
  );
}
