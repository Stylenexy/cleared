// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VaultFixture, Vm} from "./ClearedVault.t.sol";
import {ClearedVault} from "../src/ClearedVault.sol";
import {PayeeRegistry} from "../src/PayeeRegistry.sol";

contract AutonomyTest is VaultFixture {
    function mature() internal {
        vm.warp(1000 + 1 days);
        vault.configureAgent(AGENT, 10e6, 1e6, uint64(block.timestamp + 3 days));
    }

    function autoExecute(uint256 id) internal {
        vm.prank(AGENT);
        vault.agentExecute(id);
    }

    function testAgentAutoPaysWithoutOwner() public {
        mature();
        autoExecute(stage(item(101, 250_000)));
        require(token.balanceOf(VENDOR) == 250_000);
    }

    function testNewPayeeOnHold() public {
        uint256 id = stage(item(102, 1));
        vm.expectEmit(true, true, false, true);
        emit Rejected(id, bytes32(uint256(102)), ClearedVault.Reason.PayeeOnHold);
        autoExecute(id);
        require(token.balanceOf(VENDOR) == 0);
    }

    function testOwnerCanApproveNewPayee() public {
        vault.approveAndExecute(stage(item(103, 1)));
        require(token.balanceOf(VENDOR) == 1);
    }

    function testHeldBatchStillNeedsOwnerAfterDelay() public {
        vault.configureAgent(AGENT, 10e6, 1e6, uint64(4 days));
        uint256 id = stage(item(104, 1));
        require(vault.batchRequiresOwner(id, 0));
        vm.warp(2 days);
        autoExecute(id);
        require(token.balanceOf(VENDOR) == 0);
    }

    function testChangedAddressRestartsHold() public {
        mature();
        registry.register("Kopi Pagi", POISON, bytes32(0));
        require(registry.holdRemaining("Kopi Pagi", POISON) == 1 days);
        ClearedVault.Item memory it = item(105, 1);
        it.payee = POISON;
        autoExecute(stage(it));
        require(token.balanceOf(POISON) == 0);
    }

    function testRegistryChangeAfterStageIsRechecked() public {
        mature();
        uint256 id = stage(item(106, 1));
        registry.register("Kopi Pagi", POISON, bytes32(0));
        registry.register("Kopi Pagi", VENDOR, bytes32(0));
        autoExecute(id);
        require(token.balanceOf(VENDOR) == 0);
    }

    function testMetadataEditDoesNotRestartHold() public {
        mature();
        registry.registerWithMetadata("Kopi Pagi", VENDOR, keccak256("new document"), "ipfs://updated");
        require(registry.holdRemaining("Kopi Pagi", VENDOR) == 0);
        autoExecute(stage(item(107, 1)));
        require(token.balanceOf(VENDOR) == 1);
    }

    function testKillSwitchStopsAutoPay() public {
        mature();
        uint256 id = stage(item(108, 1));
        vault.setFrozen(true);
        vm.expectEmit(true, true, false, true);
        emit Rejected(id, bytes32(uint256(108)), ClearedVault.Reason.Frozen);
        autoExecute(id);
        require(token.balanceOf(VENDOR) == 0);
    }

    function testKillSwitchStopsOwnerApprovedAgentBatch() public {
        uint256 id = stage(item(109, 1));
        vault.setFrozen(true);
        reject(id, 109, ClearedVault.Reason.Frozen);
    }

    function testOnlyOwnerCanFreeze() public {
        vm.prank(AGENT);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        vault.setFrozen(true);
    }

    function testOwnerCanResume() public {
        mature();
        vault.setFrozen(true);
        vault.setFrozen(false);
        autoExecute(stage(item(110, 1)));
        require(token.balanceOf(VENDOR) == 1);
    }

    function testDailyCapResetsAtUTCDayBoundary() public {
        mature();
        vault.setDailyLimit(500_000);
        autoExecute(stage(item(111, 500_000)));
        autoExecute(stage(item(112, 1)));
        require(token.balanceOf(VENDOR) == 500_000 && vault.dailyRemaining() == 0);
        vm.warp((block.timestamp / 1 days + 1) * 1 days);
        require(vault.dailyRemaining() == 500_000);
        autoExecute(stage(item(113, 500_000)));
        require(token.balanceOf(VENDOR) == 1e6);
    }

    function testDailyCapSharedAcrossAgentsAndOwnerApprovals() public {
        mature();
        vault.setDailyLimit(100);
        autoExecute(stage(item(114, 60)));
        address second = address(0xB0B);
        vault.configureAgent(second, 1000, 1000, uint64(block.timestamp + 1 days));
        ClearedVault.Item[] memory items = new ClearedVault.Item[](1);
        items[0] = item(115, 41);
        vm.prank(second);
        uint256 id = vault.stageBatch(items);
        vault.approveAndExecute(id);
        require(token.balanceOf(VENDOR) == 60 && vault.dailyRemaining() == 40);
    }

    function testRegrantDoesNotResetDailySpend() public {
        mature();
        vault.setDailyLimit(100);
        autoExecute(stage(item(116, 100)));
        vault.configureAgent(AGENT, 1000, 1000, uint64(block.timestamp + 1 days));
        autoExecute(stage(item(117, 1)));
        require(token.balanceOf(VENDOR) == 100);
    }

    function testOnlyBatchAgentCanAutoExecute() public {
        mature();
        uint256 id = stage(item(118, 1));
        vm.prank(POISON);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        vault.agentExecute(id);
    }

    function testRevokedAgentCannotAutoPay() public {
        mature();
        uint256 id = stage(item(119, 1));
        vault.revokeAgent(AGENT);
        autoExecute(id);
        require(token.balanceOf(VENDOR) == 0);
    }

    function testPreviewMatchesNewPayeeDecision() public view {
        require(vault.previewPayment(AGENT, item(120, 1), false) == ClearedVault.Reason.PayeeOnHold);
        require(vault.previewPayment(AGENT, item(120, 1), true) == ClearedVault.Reason.None);
    }

    function testRemovedAndReaddedPayeeRestartsHold() public {
        mature();
        registry.remove("Kopi Pagi");
        registry.register("Kopi Pagi", VENDOR, bytes32(0));
        require(registry.holdRemaining("Kopi Pagi", VENDOR) == 1 days);
    }

    function testOnlyOwnerCanSetDailyLimit() public {
        vm.prank(AGENT);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        vault.setDailyLimit(1);
    }

    function testCannotSetZeroDailyLimit() public {
        vm.expectRevert(ClearedVault.InvalidConfig.selector);
        vault.setDailyLimit(0);
    }
}
