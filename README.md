# JustFlip — provably-fair on-chain coinflip

Казино-coinflip на Ethereum Sepolia, где **честность исхода проверяема в блокчейне**.
Случайность даёт [Chainlink VRF v2.5](https://docs.chain.link/vrf) — ни казино, ни игрок
не могут её подкрутить. Преимущество казино зашито только в публичный коэффициент выплаты,
а не в результат броска.

## Live

- **Приложение:** https://coin-game-navy.vercel.app/
- **Casino:** [`0x7f1D029Eb0512bC9258D05EDD64CAc6b923E52f3`](https://sepolia.etherscan.io/address/0x7f1D029Eb0512bC9258D05EDD64CAc6b923E52f3) (верифицирован)
- **ChipToken (CHIP):** [`0xb6b1e56213993b84b25BD40F2cEc378eaE742A69`](https://sepolia.etherscan.io/address/0xb6b1e56213993b84b25BD40F2cEc378eaE742A69) (верифицирован)
- **Сеть:** Ethereum Sepolia (chainId 11155111)

## Как это работает

1. Игрок берёт тестовые **CHIP** из крана (1000 CHIP раз в час), вносит их в казино (`deposit`).
2. Ставит на **орёл/решку** (`placeBet`) — контракт запрашивает случайное число у Chainlink VRF
   и резервирует возможную выплату из банкролла.
3. VRF отвечает **второй транзакцией** с числом и криптографическим доказательством; тот же
   вызов определяет исход: `outcome = randomWord % 2`.
4. При выигрыше баланс игрока пополняется на `amount × payoutBps / 10000`; при проигрыше ставка
   уходит в банкролл. Вывести CHIP можно в любой момент (`withdraw`).

**Параметры по умолчанию:** выплата ×1.96 (`payoutBps = 19600`), house edge **2%**,
лимиты ставки 1–50 CHIP, `requestConfirmations = 3`, `callbackGasLimit = 150 000`.

## Почему это честно (provably fair)

Каждую ставку можно перепроверить вручную на Etherscan:

1. Событие **`BetPlaced`** — ваша ставка, выбор и `requestId`.
2. Транзакция-исполнение от официального **VRF Coordinator** со случайным числом.
3. Событие **`BetSettled`** — пересчитайте сами:
   - `outcome = randomWord % 2`
   - `payout = amount × payoutBps / 10000`

   и сверьте с фактической выплатой. Шансы честные 50/50 — VRF выдаёт число уже после того,
   как ставка зафиксирована в блоке.

## Стек

| Слой | Технологии |
|------|-----------|
| Контракты | Solidity 0.8.24, Foundry, OpenZeppelin, Chainlink VRF v2.5 |
| Фронтенд | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 |
| Web3 | wagmi v2 · viem v2 · RainbowKit 2.2 · TanStack Query v5 |
| Деплой | Контракты — Sepolia · Фронт — Vercel |

## Локальный запуск

### Контракты

```bash
cd contracts
forge install          # подтянуть сабмодули (forge-std, openzeppelin, chainlink)
forge build
forge test             # тесты с VRFCoordinatorV2_5Mock (см. docs/adr/ADR-001.md)
```

### Фронтенд

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

Адреса контрактов по умолчанию зашиты в `web/lib/config.ts` (текущий Sepolia-деплой).
Переопределить для другого окружения:

```bash
# web/.env.local
NEXT_PUBLIC_CHIP_ADDRESS=0x...
NEXT_PUBLIC_CASINO_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...   # опционально — вход по WalletConnect QR
```

## Деплой контрактов

```bash
cd contracts
cp .env.example .env    # заполнить RPC, PRIVATE_KEY, VRF_SUBSCRIPTION_ID, ETHERSCAN_API_KEY

# 1. деплой ChipToken + Casino (+ верификация на Etherscan)
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

# 2. добавить Casino как consumer VRF-подписки
cast send <VRF_COORDINATOR> "addConsumer(uint256,address)" $VRF_SUBSCRIPTION_ID <CASINO_ADDR> \
  --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

# 3. наполнить банкролл казино (faucet → approve → fundHouse)
CHIP_ADDRESS=<...> CASINO_ADDRESS=<...> \
  forge script script/FundHouse.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
```

> **Про стоимость VRF.** `subscriptionId` и `callbackGasLimit` задаются в конструкторе и
> неизменяемы — менять их можно только передеплоем. VRF резервирует максимально возможную
> стоимость фулфилмента (`~(115k + callbackGasLimit) × max gas price`), поэтому лимит держим
> близким к реальному расходу `fulfillRandomWords` (~150k), чтобы не требовать огромного
> запаса LINK на подписке.

## Структура

```
contracts/
  src/          ChipToken.sol, Casino.sol
  script/       Deploy.s.sol, FundHouse.s.sol
  test/         Casino.t.sol
web/
  app/          App Router (layout, page, providers)
  components/   CoinflipGame, ProvablyFair, DepositWithdraw, FaucetCard, ...
  hooks/        useCoinflip, usePlayerLedger, useCasinoParams, ...
  lib/          config, abi, contracts, wagmi, payout
docs/adr/       архитектурные решения (ADR-001 — источник случайности)
```

## Архитектурные заметки

- **Источник случайности без своей абстракции** — `Casino` наследует `VRFConsumerBaseV2Plus`
  напрямую; подмена для тестов — на уровне адреса координатора (`VRFCoordinatorV2_5Mock`),
  а не через самописный интерфейс. Подробнее: [docs/adr/ADR-001.md](docs/adr/ADR-001.md).
- **Защита от гонок на фронте** — результат ловится подпиской на `BetSettled` с
  `fromBlock = блок ставки` + поллинг; незавершённая ставка дублируется в `localStorage`,
  поэтому переживает перезагрузку страницы.
