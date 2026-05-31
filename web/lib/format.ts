import { formatEther, parseEther } from "viem";

/** Форматирует сумму в wei как CHIP с двумя знаками. */
export function formatChip(value: bigint | undefined): string {
  if (value === undefined) return "—";
  return Number(formatEther(value)).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  });
}

/**
 * Безопасно парсит строку суммы в wei без try/catch (§12.C):
 * принимает только целое или десятичное с ≤18 знаками, иначе null.
 */
export function parseChip(value: string): bigint | null {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) return null;
  return parseEther(value);
}

/** Человеко-читаемая длительность из секунд: «5м 30с» / «30с». */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}м ${s}с` : `${s}с`;
}

/** Короткое читаемое сообщение об ошибке транзакции (rejection/revert). */
export function shortError(error: Error): string {
  return (error as { shortMessage?: string }).shortMessage ?? error.message;
}
