// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {Casino} from "../src/Casino.sol";
import {
    VRFCoordinatorV2_5Mock
} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract CasinoTest is Test {
    ChipToken internal chip;
    Casino internal casino;
    VRFCoordinatorV2_5Mock internal coordinator;
    uint256 internal subId;

    address internal player = makeAddr("player");

    uint256 internal constant DEPOSIT = 100 ether;
    uint256 internal constant BET = 10 ether;
    uint256 internal constant HOUSE = 500 ether;
    bytes32 internal constant KEY_HASH = keccak256("gas-lane");

    function setUp() public {
        chip = new ChipToken();

        coordinator = new VRFCoordinatorV2_5Mock(0.001 ether, 1e9, 4e15);
        subId = coordinator.createSubscription();
        coordinator.fundSubscription(subId, uint96(100 ether));

        casino = new Casino(
            address(chip), address(coordinator), subId, KEY_HASH, 500_000, 3, 1 ether, 100 ether
        );
        coordinator.addConsumer(subId, address(casino));

        // Банкролл: владелец (этот контракт) берёт CHIP из крана и наполняет house.
        chip.faucet();
        chip.approve(address(casino), type(uint256).max);
        casino.fundHouse(HOUSE);

        // Игрок: кран + депозит.
        vm.startPrank(player);
        chip.faucet();
        chip.approve(address(casino), type(uint256).max);
        casino.deposit(DEPOSIT);
        vm.stopPrank();
    }

    // --- кран + кулдаун ---

    function test_FaucetCooldown() public {
        address fresh = makeAddr("fresh");
        vm.prank(fresh);
        chip.faucet();
        assertEq(chip.balanceOf(fresh), chip.FAUCET_AMOUNT());

        vm.prank(fresh);
        vm.expectRevert(); // FaucetCooldownActive
        chip.faucet();

        vm.warp(block.timestamp + chip.FAUCET_COOLDOWN());
        vm.prank(fresh);
        chip.faucet();
        assertEq(chip.balanceOf(fresh), 2 * chip.FAUCET_AMOUNT());
    }

    // --- депозит / вывод ---

    function test_DepositWithdraw() public {
        assertEq(casino.balances(player), DEPOSIT);
        uint256 walletBefore = chip.balanceOf(player);

        vm.prank(player);
        casino.withdraw(40 ether);

        assertEq(casino.balances(player), DEPOSIT - 40 ether);
        assertEq(chip.balanceOf(player), walletBefore + 40 ether);
    }

    function test_WithdrawRevertsOverBalance() public {
        vm.prank(player);
        vm.expectRevert(Casino.InsufficientBalance.selector);
        casino.withdraw(DEPOSIT + 1);
    }

    // --- выигрыш ---

    function test_WinPath() public {
        uint256 requestId = _placeBet(0, BET);
        uint256 payout = BET * 19600 / 10000; // 19.6

        vm.expectEmit(true, true, false, true, address(casino));
        emit Casino.BetSettled(requestId, player, 0, 0, true, payout);
        _fulfill(requestId, 0); // чётное → outcome 0 → совпало с choice 0

        assertEq(casino.balances(player), DEPOSIT - BET + payout);
        assertEq(casino.houseBalance(), HOUSE - (payout - BET)); // -9.6
    }

    // --- проигрыш ---

    function test_LosePath() public {
        uint256 requestId = _placeBet(0, BET);

        vm.expectEmit(true, true, false, true, address(casino));
        emit Casino.BetSettled(requestId, player, 1, 1, false, 0);
        _fulfill(requestId, 1); // нечётное → outcome 1 → не совпало

        assertEq(casino.balances(player), DEPOSIT - BET);
        assertEq(casino.houseBalance(), HOUSE + BET);
    }

    // --- платёжеспособность ---

    function test_PlaceBetRevertsWhenHouseInsufficient() public {
        casino.withdrawHouse(HOUSE); // осушаем банкролл
        vm.prank(player);
        vm.expectRevert(Casino.HouseInsufficient.selector);
        casino.placeBet(0, BET);
    }

    function test_PlaceBetRevertsOutOfRange() public {
        vm.prank(player);
        vm.expectRevert(abi.encodeWithSelector(Casino.BetOutOfRange.selector, 1 ether, 100 ether));
        casino.placeBet(0, 0.5 ether);
    }

    // --- F1: резерв банкролла на параллельных ставках ---

    function test_F1_ConcurrentBetsReserveBankroll() public {
        uint256 reservePerBet = BET * (19600 - 10000) / 10000; // 9.6
        // оставляем банкролл ровно на две ставки
        casino.withdrawHouse(HOUSE - 2 * reservePerBet);
        assertEq(casino.houseBalance(), 2 * reservePerBet);

        uint256 r1 = _placeBet(0, BET);
        uint256 r2 = _placeBet(0, BET);
        assertEq(casino.houseBalance(), 0); // обе ставки уже зарезервированы

        // третья ставка не должна перезаложить пустой банкролл
        vm.prank(player);
        vm.expectRevert(Casino.HouseInsufficient.selector);
        casino.placeBet(0, BET);

        // обе выигрывают — резолв проходит без underflow/реверта
        uint256 payout = BET * 19600 / 10000;
        _fulfill(r1, 0);
        _fulfill(r2, 0);
        assertEq(casino.balances(player), DEPOSIT - 2 * BET + 2 * payout);
        assertEq(casino.houseBalance(), 0);
    }

    // --- идемпотентность резолва (F5: колбэк не реверзит) ---

    function test_NoDoubleSettle() public {
        uint256 requestId = _placeBet(0, BET);
        _fulfill(requestId, 0);
        uint256 balAfter = casino.balances(player);
        uint256 houseAfter = casino.houseBalance();

        // повторный колбэк по тому же requestId тихо игнорируется
        uint256[] memory words = new uint256[](1);
        words[0] = 0;
        vm.prank(address(coordinator));
        casino.rawFulfillRandomWords(requestId, words);

        assertEq(casino.balances(player), balAfter);
        assertEq(casino.houseBalance(), houseAfter);
    }

    // --- helpers ---

    function _placeBet(uint8 choice, uint256 amount) internal returns (uint256 requestId) {
        vm.prank(player);
        requestId = casino.placeBet(choice, amount);
    }

    function _fulfill(uint256 requestId, uint256 word) internal {
        uint256[] memory words = new uint256[](1);
        words[0] = word;
        coordinator.fulfillRandomWordsWithOverride(requestId, address(casino), words);
    }
}
