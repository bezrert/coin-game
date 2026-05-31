// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ChipToken — тестовый ERC-20 «CHIP» с краном
/// @notice Игровая фишка казино. Кран выдаёт фиксированную сумму с кулдауном,
///         чтобы любой мог получить тестовые токены без реальной стоимости.
contract ChipToken is ERC20 {
    /// @notice Сумма выдачи крана за один вызов (1000 CHIP).
    uint256 public constant FAUCET_AMOUNT = 1000 ether;

    /// @notice Минимальный интервал между выдачами крана для одного адреса.
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    /// @notice Время последней выдачи крана по адресу.
    mapping(address account => uint256 timestamp) public lastClaim;

    /// @notice Кран вызван слишком рано после прошлой выдачи.
    /// @param availableAt метка времени, когда выдача снова станет доступна.
    error FaucetCooldownActive(uint256 availableAt);

    /// @notice Выдача токенов краном.
    event FaucetClaimed(address indexed user, uint256 amount);

    constructor() ERC20("Casino Chip", "CHIP") {}

    /// @notice Получить тестовые CHIP. Доступно раз в FAUCET_COOLDOWN на адрес.
    function faucet() external {
        uint256 availableAt = lastClaim[msg.sender] + FAUCET_COOLDOWN;
        // Манипуляция timestamp майнером (~15с) несущественна для часового кулдауна крана.
        // forge-lint: disable-next-line(block-timestamp)
        if (lastClaim[msg.sender] != 0 && block.timestamp < availableAt) {
            revert FaucetCooldownActive(availableAt);
        }
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
}
