import { sepolia } from "wagmi/chains";

/** Сеть проекта — Ethereum Sepolia. */
export const CHAIN = sepolia;

/**
 * Адреса задеплоенных контрактов (Sepolia) — единственный источник истины.
 * Можно переопределить через NEXT_PUBLIC_* для другого окружения.
 */
export const CONTRACTS = {
  chip: (process.env.NEXT_PUBLIC_CHIP_ADDRESS ??
    "0xb6b1e56213993b84b25BD40F2cEc378eaE742A69") as `0x${string}`,
  casino: (process.env.NEXT_PUBLIC_CASINO_ADDRESS ??
    "0x7f1D029Eb0512bC9258D05EDD64CAc6b923E52f3") as `0x${string}`,
};

export const EXPLORER_URL = "https://sepolia.etherscan.io";

/** Ссылка на адрес в блок-эксплорере. */
export const explorerAddress = (addr: string) => `${EXPLORER_URL}/address/${addr}`;

/** Ссылка на транзакцию в блок-эксплорере. */
export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;

/** projectId WalletConnect (reown). Пустой = работает только инжектируемый кошелёк. */
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
