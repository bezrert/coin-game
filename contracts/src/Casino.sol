// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {
    VRFConsumerBaseV2Plus
} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/// @title Casino — проверяемый on-chain coinflip на Chainlink VRF v2.5
/// @notice Игрок вносит CHIP, ставит на «орёл/решка», результат приходит вторым
///         tx от Chainlink. Вероятность честная 50/50, edge зашит только в
///         коэффициент выплаты payoutBps (публичен). См. ADR-001.
contract Casino is VRFConsumerBaseV2Plus, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_PAYOUT_BPS = 20000;

    /// @notice Запись об одной ставке (ключ — requestId от VRF).
    struct Bet {
        address player; // 160 бит
        uint128 amount; // ставка
        uint128 housePayout; // снапшот зарезервированной доплаты сверх ставки
        uint8 choice; // 0 = орёл, 1 = решка
        bool settled; // защита от повторного резолва
    }

    IERC20 public immutable chip;
    mapping(address account => uint256 amount) public balances;
    uint256 public houseBalance;
    uint256 public payoutBps = 19600;
    uint256 public minBet;
    uint256 public maxBet;
    mapping(uint256 requestId => Bet bet) public bets;

    bytes32 public keyHash;
    uint256 public subscriptionId;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;

    event Deposit(address indexed player, uint256 amount);
    event Withdraw(address indexed player, uint256 amount);
    event BetPlaced(
        uint256 indexed requestId, address indexed player, uint256 amount, uint8 choice
    );
    event BetSettled(
        uint256 indexed requestId,
        address indexed player,
        uint256 randomWord,
        uint8 outcome,
        bool win,
        uint256 payout
    );
    event HouseFunded(uint256 amount);
    event HouseWithdrawn(uint256 amount);
    event PayoutBpsUpdated(uint256 payoutBps);
    event BetLimitsUpdated(uint256 minBet, uint256 maxBet);

    error ZeroAmount();
    error InvalidChoice();
    error BetOutOfRange(uint256 minBet, uint256 maxBet);
    error InsufficientBalance();
    error HouseInsufficient();
    error InvalidPayoutBps();
    error InvalidBetLimits();

    constructor(
        address chipToken,
        address coordinator,
        uint256 subId,
        bytes32 vrfKeyHash,
        uint32 gasLimit,
        uint16 confirmations,
        uint256 minBet_,
        uint256 maxBet_
    ) VRFConsumerBaseV2Plus(coordinator) {
        chip = IERC20(chipToken);
        subscriptionId = subId;
        keyHash = vrfKeyHash;
        callbackGasLimit = gasLimit;
        requestConfirmations = confirmations;
        _setBetLimits(minBet_, maxBet_);
    }

    // --- функции игрока ---

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        balances[msg.sender] += amount;
        chip.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        balances[msg.sender] -= amount;
        chip.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    /// @notice Сделать ставку. Резолв придёт асинхронно в fulfillRandomWords.
    /// @param choice 0 = орёл, 1 = решка.
    /// @param amount размер ставки (CHIP).
    /// @return requestId идентификатор VRF-запроса (ключ ставки).
    function placeBet(uint8 choice, uint256 amount)
        external
        nonReentrant
        returns (uint256 requestId)
    {
        if (choice > 1) revert InvalidChoice();
        if (amount < minBet || amount > maxBet) revert BetOutOfRange(minBet, maxBet);
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        // Платёжеспособность + резерв доплаты: снимаем сразу, чтобы параллельные
        // ставки «в полёте» не перезакладывали один и тот же банкролл (F1/F2).
        uint256 housePayout = amount * (payoutBps - BPS_DENOMINATOR) / BPS_DENOMINATOR;
        if (housePayout > houseBalance) revert HouseInsufficient();

        balances[msg.sender] -= amount;
        houseBalance -= housePayout;

        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        // Касты в uint128 безопасны: amount <= maxBet <= type(uint128).max
        // (гард в _setBetLimits), housePayout < amount.
        bets[requestId] = Bet({
            player: msg.sender,
            // forge-lint: disable-next-line(unsafe-typecast)
            amount: uint128(amount),
            // forge-lint: disable-next-line(unsafe-typecast)
            housePayout: uint128(housePayout),
            choice: choice,
            settled: false
        });
        emit BetPlaced(requestId, msg.sender, amount, choice);
    }

    // --- резолв (колбэк Chainlink) ---

    /// @dev Не реверзит ни при каких условиях, чтобы не уронить fulfillment (F5).
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords)
        internal
        override
    {
        Bet storage bet = bets[requestId];
        if (bet.player == address(0) || bet.settled) return; // тихий выход
        bet.settled = true;

        uint256 randomWord = randomWords[0];
        // Результат % 2 всегда 0 или 1 — каст в uint8 не теряет данных.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint8 outcome = uint8(randomWord % 2);
        uint256 amount = bet.amount;
        uint256 housePayout = bet.housePayout;
        bool win = outcome == bet.choice;
        uint256 payout = 0;

        if (win) {
            payout = amount + housePayout; // == amount * payoutBps / 1e4
            balances[bet.player] += payout; // банкролл уже зарезервирован в placeBet
        } else {
            houseBalance += amount + housePayout; // возврат резерва + выигранный стейк
        }

        emit BetSettled(requestId, bet.player, randomWord, outcome, win, payout);
    }

    // --- функции владельца ---

    function fundHouse(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        houseBalance += amount;
        chip.safeTransferFrom(msg.sender, address(this), amount);
        emit HouseFunded(amount);
    }

    function withdrawHouse(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (houseBalance < amount) revert HouseInsufficient();
        houseBalance -= amount;
        chip.safeTransfer(msg.sender, amount);
        emit HouseWithdrawn(amount);
    }

    function setPayoutBps(uint256 newPayoutBps) external onlyOwner {
        if (newPayoutBps < BPS_DENOMINATOR || newPayoutBps > MAX_PAYOUT_BPS) {
            revert InvalidPayoutBps();
        }
        payoutBps = newPayoutBps;
        emit PayoutBpsUpdated(newPayoutBps);
    }

    function setBetLimits(uint256 newMinBet, uint256 newMaxBet) external onlyOwner {
        _setBetLimits(newMinBet, newMaxBet);
    }

    function _setBetLimits(uint256 newMinBet, uint256 newMaxBet) private {
        if (newMinBet == 0 || newMinBet > newMaxBet || newMaxBet > type(uint128).max) {
            revert InvalidBetLimits();
        }
        minBet = newMinBet;
        maxBet = newMaxBet;
        emit BetLimitsUpdated(newMinBet, newMaxBet);
    }
}
