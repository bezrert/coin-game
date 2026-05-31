import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NetworkGuard } from "@/components/NetworkGuard";
import { BalanceBar } from "@/components/BalanceBar";
import { FaucetCard } from "@/components/FaucetCard";
import { DepositWithdraw } from "@/components/DepositWithdraw";
import { CoinflipGame } from "@/components/CoinflipGame";
import { ProvablyFair } from "@/components/ProvablyFair";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Just<span className="text-neon-cyan">Flip</span>
          </h1>
          <p className="text-sm text-foreground/60">
            On-chain казино на Chainlink VRF · Sepolia
          </p>
        </div>
        <ConnectButton />
      </header>

      <NetworkGuard />
      <BalanceBar />

      <div className="grid gap-4 sm:grid-cols-2">
        <FaucetCard />
        <DepositWithdraw />
      </div>

      <CoinflipGame />
      <ProvablyFair />
    </main>
  );
}
