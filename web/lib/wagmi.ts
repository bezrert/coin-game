import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { WALLETCONNECT_PROJECT_ID } from "./config";

/**
 * Конфигурация wagmi + RainbowKit. Единственная поддерживаемая сеть — Sepolia.
 * projectId-заглушка позволяет работать инжектируемому кошельку (MetaMask),
 * а реальный id включает WalletConnect (QR и мобильные кошельки).
 */
export const wagmiConfig = getDefaultConfig({
  appName: "JustFlip",
  projectId: WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000",
  chains: [sepolia],
  ssr: true,
});
