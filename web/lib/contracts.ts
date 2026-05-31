import { CONTRACTS } from "./config";
import { chipAbi, casinoAbi } from "./abi";

/**
 * Связки адрес+ABI — один источник на контракт. Места вызова делают
 * `{ ...chip, functionName }` вместо ручной пары, которую легко рассинхронить.
 */
export const chip = { address: CONTRACTS.chip, abi: chipAbi } as const;
export const casino = { address: CONTRACTS.casino, abi: casinoAbi } as const;
