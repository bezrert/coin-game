// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ChipToken} from "../src/ChipToken.sol";
import {Casino} from "../src/Casino.sol";

/// @notice Деплой ChipToken + Casino в Sepolia с боевыми параметрами VRF v2.5.
contract Deploy is Script {
    // --- сетевые константы Sepolia VRF v2.5 (сверено с docs.chain.link) ---
    address constant VRF_COORDINATOR = 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B;
    bytes32 constant KEY_HASH = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;
    uint32 constant CALLBACK_GAS_LIMIT = 500_000;
    uint16 constant REQUEST_CONFIRMATIONS = 3;

    // --- игровые лимиты ---
    uint256 constant MIN_BET = 1 ether; // 1 CHIP
    uint256 constant MAX_BET = 50 ether; // 50 CHIP

    function run() external returns (ChipToken chip, Casino casino) {
        uint256 subId = vm.envUint("VRF_SUBSCRIPTION_ID");
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        chip = new ChipToken();
        casino = new Casino(
            address(chip),
            VRF_COORDINATOR,
            subId,
            KEY_HASH,
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            MIN_BET,
            MAX_BET
        );
        vm.stopBroadcast();

        console2.log("ChipToken:", address(chip));
        console2.log("Casino:", address(casino));
    }
}
