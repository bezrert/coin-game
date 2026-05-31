import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { WALLETCONNECT_PROJECT_ID } from "./config";

/**
 * Надёжный Sepolia-RPC. Дефолтный публичный эндпоинт viem нестабилен для
 * поллинга логов (eth_getLogs), из-за чего useWatchContractEvent не долавливал
 * BetSettled. Задаём явный транспорт; на Vercel можно подставить Alchemy/Infura
 * через NEXT_PUBLIC_SEPOLIA_RPC_URL для большей надёжности.
 */
const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

/**
 * Конфигурация wagmi + RainbowKit. Единственная поддерживаемая сеть — Sepolia.
 * projectId-заглушка позволяет работать инжектируемому кошельку (MetaMask),
 * а реальный id включает WalletConnect (QR и мобильные кошельки).
 */
export const wagmiConfig = getDefaultConfig({
  appName: "JustFlip",
  projectId: WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC),
  },
  ssr: true,
});
