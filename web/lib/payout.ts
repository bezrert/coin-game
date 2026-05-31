/**
 * Математика выплаты coinflip — единственный держатель формулы edge на фронте.
 * Зеркало Casino.sol (placeBet/fulfillRandomWords, §5): чистые функции без wagmi,
 * это и есть тестовая поверхность математики. BPS_DENOMINATOR живёт здесь один раз.
 */

/** Знаменатель basis points — зеркало Casino.sol:BPS_DENOMINATOR (10000). */
export const BPS_DENOMINATOR = BigInt(10000);

export type PayoutQuote = {
  /** Полная выплата при победе: amount * payoutBps / 1e4. */
  potentialWin: bigint;
  /** Доплата казино сверх ставки (резерв банкролла): amount * (payoutBps - 1e4) / 1e4. */
  housePayout: bigint;
};

/**
 * Считает выплату ставки — зеркало Casino.placeBet (резерв) и fulfillRandomWords (выплата).
 * @param amount размер ставки в wei.
 * @param payoutBps коэффициент выплаты в basis points (19600 = ×1.96).
 * @return полная выплата при победе и доплата казино сверх ставки.
 */
export function quotePayout(amount: bigint, payoutBps: bigint): PayoutQuote {
  return {
    potentialWin: (amount * payoutBps) / BPS_DENOMINATOR,
    housePayout: (amount * (payoutBps - BPS_DENOMINATOR)) / BPS_DENOMINATOR,
  };
}

/** Коэффициент выплаты как число для показа: 19600 bps → 1.96. */
export function payoutMultiplier(payoutBps: bigint): number {
  return Number(payoutBps) / Number(BPS_DENOMINATOR);
}

/**
 * House edge для честного 50/50 coinflip: 1 - 0.5 * multiplier.
 * Вероятность не подкручена; edge живёт только в payoutBps.
 * payoutBps 19600 → multiplier 1.96 → edge 2%.
 */
export function houseEdgePercent(payoutBps: bigint): number {
  return (1 - 0.5 * payoutMultiplier(payoutBps)) * 100;
}
