// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {Casino} from "../src/Casino.sol";

/// @notice Наполнить банкролл: faucet → approve → fundHouse.
/// @dev HOUSE_FUNDING не больше FAUCET_AMOUNT (1000 CHIP) за один прогон.
contract FundHouse is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        ChipToken chip = ChipToken(vm.envAddress("CHIP_ADDRESS"));
        Casino casino = Casino(vm.envAddress("CASINO_ADDRESS"));
        uint256 amount = vm.envUint("HOUSE_FUNDING");

        vm.startBroadcast(deployerKey);
        chip.faucet(); // 1000 CHIP владельцу
        chip.approve(address(casino), amount);
        casino.fundHouse(amount);
        vm.stopBroadcast();

        console2.log("House funded:", amount);
    }
}
