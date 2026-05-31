/**
 * Предусловия ставки на фронте — единственный держатель правил «можно ли ставить».
 * Зеркало Casino.placeBet (BetOutOfRange / InsufficientBalance / HouseInsufficient,
 * §5): чистая функция без React и wagmi, это и есть её тестовая поверхность.
 * Контракт остаётся авторитетом — здесь только понятная причина для UX, чтобы
 * правила не дублировались в JSX и не дрейфовали относительно контракта.
 */

import { quotePayout } from "./payout";
import { formatChip } from "./format";

export type BetInputs = {
  /** Распарсенная ставка в wei; null — сумма не введена или невалидна. */
  amount: bigint | null;
  /** Лимиты и состояние казино. undefined = ещё не загрузилось (не блокируем). */
  minBet?: bigint;
  maxBet?: bigint;
  /** Депозит игрока внутри казино. */
  casinoChip?: bigint;
  /** Банкролл казино — резерв доплаты сверх ставки. */
  houseBalance?: bigint;
  /** Коэффициент выплаты в basis points (для расчёта резерва). */
  payoutBps?: bigint;
};

/**
 * Причина, по которой ставку нельзя сделать, либо null если можно.
 * Параметры, которые ещё не подгрузились (undefined), не блокируют — пропускаем,
 * чтобы UI не мигал «нельзя» на первом рендере до прихода on-chain чтений.
 * Порядок проверок повторяет placeBet: диапазон → депозит → банкролл.
 */
export function betDisabledReason(inputs: BetInputs): string | null {
  const { amount, minBet, maxBet, casinoChip, houseBalance, payoutBps } = inputs;

  if (amount === null) return "Введите сумму";
  if (minBet !== undefined && amount < minBet) return `Минимум ${formatChip(minBet)} CHIP`;
  if (maxBet !== undefined && amount > maxBet) return `Максимум ${formatChip(maxBet)} CHIP`;
  if (casinoChip !== undefined && amount > casinoChip) {
    return "Не хватает CHIP в казино — внесите депозит";
  }
  if (payoutBps !== undefined && houseBalance !== undefined) {
    const { housePayout } = quotePayout(amount, payoutBps);
    if (housePayout > houseBalance) return "Банкролл казино мал для такой ставки";
  }
  return null;
}
