// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ClearedVault, IUSD8} from "../src/ClearedVault.sol";
import {PayeeRegistry} from "../src/PayeeRegistry.sol";

interface DeployVm {
    function envUint(string calldata) external returns (uint256);
    function addr(uint256) external returns (address);
    function startBroadcast(uint256) external;
    function stopBroadcast() external;
}
/// Prepared only. The task does not authorize broadcasting to Aevum.

contract DeployAevum {
    DeployVm constant vm = DeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (PayeeRegistry registry, ClearedVault vault) {
        require(block.chainid == 44005, "Aevum testnet only");
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.addr(key);
        vm.startBroadcast(key);
        registry = new PayeeRegistry(owner);
        vault = new ClearedVault(owner, IUSD8(0x456569838f1d43009A91ebA4263147Afd7233483), registry);
        vm.stopBroadcast();
    }
}
