import { sepolia } from "wagmi/chains";

/** Сеть проекта — Ethereum Sepolia. */
export const CHAIN = sepolia;

/**
 * Адреса задеплоенных контрактов (Sepolia) — единственный источник истины.
 * Можно переопределить через NEXT_PUBLIC_* для другого окружения.
 */
export const CONTRACTS = {
  chip: (process.env.NEXT_PUBLIC_CHIP_ADDRESS ??
    "0x98B660cDB79Ea457678c15E98EB380622B30097a") as `0x${string}`,
  casino: (process.env.NEXT_PUBLIC_CASINO_ADDRESS ??
    "0xfB94F0865B87d8dC0ACbaC17D63fc725379e4De8") as `0x${string}`,
};

export const EXPLORER_URL = "https://sepolia.etherscan.io";

/** Ссылка на адрес в блок-эксплорере. */
export const explorerAddress = (addr: string) => `${EXPLORER_URL}/address/${addr}`;

/** Ссылка на транзакцию в блок-эксплорере. */
export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;

/** projectId WalletConnect (reown). Пустой = работает только инжектируемый кошелёк. */
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
