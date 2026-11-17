// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ClearedVault, IUSD8} from "../src/ClearedVault.sol";
import {PayeeRegistry} from "../src/PayeeRegistry.sol";
import {MockUSD8} from "../src/MockUSD8.sol";

interface Vm {
    function prank(address) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
    function expectEmit(bool, bool, bool, bool) external;
}

contract FalseToken is MockUSD8 {
    function transfer(address, uint256) external pure override returns (bool) {
        return false;
    }
}

contract WrongDecimals {
    function decimals() external pure returns (uint8) {
        return 18;
    }
}

abstract contract VaultFixture {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant AGENT = address(0xA6E);
    address constant VENDOR = 0x1111111111111111111111111111111111111111;
    address constant POISON = 0x1111111111111111111111111111111111111112;
    MockUSD8 token;
    PayeeRegistry registry;
    ClearedVault vault;

    event Rejected(uint256 indexed batchId, bytes32 indexed ref, ClearedVault.Reason reason);

    function setUp() public {
        vm.warp(1000);
        token = new MockUSD8();
        registry = new PayeeRegistry(address(this));
        vault = new ClearedVault(address(this), IUSD8(address(token)), registry);
        registry.register("Kopi Pagi", VENDOR, bytes32(0));
        token.mint(address(this), 100e6);
        token.approve(address(vault), 100e6);
        vault.deposit(100e6);
        vault.configureAgent(AGENT, 1e6, 600_000, 2000);
    }

    function item(uint256 ref, uint256 amount) internal pure returns (ClearedVault.Item memory) {
        return ClearedVault.Item(bytes32(ref), "Kopi Pagi", VENDOR, amount, keccak256("invoice"));
    }

    function stage(ClearedVault.Item memory it) internal returns (uint256) {
        ClearedVault.Item[] memory items = new ClearedVault.Item[](1);
        items[0] = it;
        vm.prank(AGENT);
        return vault.stageBatch(items);
    }

    function reject(uint256 id, uint256 ref, ClearedVault.Reason reason) internal {
        vm.expectEmit(true, true, false, true);
        emit Rejected(id, bytes32(ref), reason);
        vault.approveAndExecute(id);
        require(token.balanceOf(VENDOR) == 0, "unexpected payment");
    }
}

contract ClearedVaultTest is VaultFixture {
    function testSixDecimals() public {
        vault.approveAndExecute(stage(item(1, 10_001)));
        require(token.balanceOf(VENDOR) == 10_001);
        require(token.decimals() == 6);
    }

    function testPerItemLimit() public {
        reject(stage(item(1, 600_001)), 1, ClearedVault.Reason.PerItemLimit);
    }

    function testTotalLimitAcrossBatches() public {
        vault.approveAndExecute(stage(item(1, 600_000)));
        uint256 id = stage(item(2, 400_001));
        vm.expectEmit(true, true, false, true);
        emit Rejected(id, bytes32(uint256(2)), ClearedVault.Reason.TotalLimit);
        vault.approveAndExecute(id);
        require(token.balanceOf(VENDOR) == 600_000);
    }

    function testTotalLimitWithinBatch() public {
        ClearedVault.Item[] memory items = new ClearedVault.Item[](3);
        items[0] = item(1, 600_000);
        items[1] = item(2, 400_000);
        items[2] = item(3, 1);
        vm.prank(AGENT);
        uint256 id = vault.stageBatch(items);
        vault.approveAndExecute(id);
        require(token.balanceOf(VENDOR) == 1e6 && !vault.paidRefs(bytes32(uint256(3))));
    }

    function testExpiryAtExecution() public {
        uint256 id = stage(item(1, 1));
        vm.warp(2000);
        reject(id, 1, ClearedVault.Reason.Expired);
    }

    function testExpiredAgentCannotStage() public {
        vm.warp(2000);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        stage(item(1, 1));
    }

    function testRevocationAfterStage() public {
        uint256 id = stage(item(1, 1));
        vault.revokeAgent(AGENT);
        reject(id, 1, ClearedVault.Reason.Revoked);
    }

    function testRevokedAgentCannotStage() public {
        vault.revokeAgent(AGENT);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        stage(item(1, 1));
    }

    function testRegrantInvalidatesPendingBatch() public {
        uint256 id = stage(item(1, 1));
        vault.configureAgent(AGENT, 2e6, 1e6, 3000);
        reject(id, 1, ClearedVault.Reason.Revoked);
    }

    function testPoisonedAddressRejected() public {
        ClearedVault.Item memory it = item(1, 1);
        it.payee = POISON;
        reject(stage(it), 1, ClearedVault.Reason.NameMismatch);
    }

    function testExactNameMatching() public {
        ClearedVault.Item memory it = item(1, 1);
        it.name = "kopi pagi";
        reject(stage(it), 1, ClearedVault.Reason.NameMismatch);
    }

    function testRegistryRecheckedAtExecution() public {
        uint256 id = stage(item(1, 1));
        registry.remove("Kopi Pagi");
        reject(id, 1, ClearedVault.Reason.NameMismatch);
    }

    function testDuplicateReferenceAcrossBatches() public {
        vault.approveAndExecute(stage(item(1, 1)));
        uint256 id = stage(item(1, 1));
        vault.approveAndExecute(id);
        require(token.balanceOf(VENDOR) == 1);
    }

    function testDuplicateWithinBatch() public {
        ClearedVault.Item[] memory items = new ClearedVault.Item[](2);
        items[0] = item(1, 1);
        items[1] = item(1, 1);
        vm.prank(AGENT);
        uint256 id = vault.stageBatch(items);
        vault.approveAndExecute(id);
        require(token.balanceOf(VENDOR) == 1);
    }

    function testOnlyOwnerExecutes() public {
        uint256 id = stage(item(1, 1));
        vm.prank(AGENT);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        vault.approveAndExecute(id);
    }

    function testOnlyAgentStages() public {
        ClearedVault.Item[] memory items = new ClearedVault.Item[](1);
        items[0] = item(1, 1);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        vault.stageBatch(items);
    }

    function testOnlyOwnerConfigures() public {
        vm.prank(AGENT);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        vault.configureAgent(AGENT, 1, 1, 3000);
    }

    function testOnlyOwnerRevokes() public {
        vm.prank(AGENT);
        vm.expectRevert(ClearedVault.Unauthorized.selector);
        vault.revokeAgent(AGENT);
    }

    function testOnlyOwnerRegisters() public {
        vm.prank(AGENT);
        vm.expectRevert(PayeeRegistry.Unauthorized.selector);
        registry.register("Fake", POISON, bytes32(0));
    }

    function testBatchCannotReplay() public {
        uint256 id = stage(item(1, 1));
        vault.approveAndExecute(id);
        vm.expectRevert(ClearedVault.InvalidBatch.selector);
        vault.approveAndExecute(id);
    }

    function testInvalidBatchId() public {
        vm.expectRevert(ClearedVault.InvalidBatch.selector);
        vault.approveAndExecute(99);
    }

    function testZeroAmount() public {
        reject(stage(item(1, 0)), 1, ClearedVault.Reason.InvalidItem);
    }

    function testZeroReference() public {
        reject(stage(item(0, 1)), 0, ClearedVault.Reason.InvalidItem);
    }

    function testZeroInvoiceHash() public {
        ClearedVault.Item memory it = item(1, 1);
        it.invoiceHash = bytes32(0);
        reject(stage(it), 1, ClearedVault.Reason.InvalidItem);
    }

    function testInsufficientBalance() public {
        vault.withdraw(100e6);
        reject(stage(item(1, 1)), 1, ClearedVault.Reason.InsufficientBalance);
    }

    function testEmptyBatch() public {
        ClearedVault.Item[] memory items = new ClearedVault.Item[](0);
        vm.prank(AGENT);
        vm.expectRevert(ClearedVault.InvalidBatch.selector);
        vault.stageBatch(items);
    }

    function testBatchSizeBound() public {
        ClearedVault.Item[] memory items = new ClearedVault.Item[](51);
        vm.prank(AGENT);
        vm.expectRevert(ClearedVault.InvalidBatch.selector);
        vault.stageBatch(items);
    }

    function testWrongDecimals() public {
        WrongDecimals wrong = new WrongDecimals();
        vm.expectRevert(ClearedVault.InvalidConfig.selector);
        new ClearedVault(address(this), IUSD8(address(wrong)), registry);
    }

    function testMixedBatchPaysValidItems() public {
        ClearedVault.Item[] memory items = new ClearedVault.Item[](3);
        items[0] = item(1, 200_000);
        items[1] = item(2, 200_000);
        items[1].payee = POISON;
        items[2] = item(3, 300_000);
        vm.prank(AGENT);
        uint256 id = vault.stageBatch(items);
        vault.approveAndExecute(id);
        require(
            token.balanceOf(VENDOR) == 500_000 && token.balanceOf(POISON) == 0 && !vault.paidRefs(bytes32(uint256(2)))
        );
    }

    function testFalseTokenRevertsAtomically() public {
        FalseToken bad = new FalseToken();
        ClearedVault v = new ClearedVault(address(this), IUSD8(address(bad)), registry);
        bad.mint(address(v), 1e6);
        v.configureAgent(AGENT, 1e6, 1e6, 2000);
        ClearedVault.Item[] memory items = new ClearedVault.Item[](1);
        items[0] = item(1, 1);
        vm.prank(AGENT);
        uint256 id = v.stageBatch(items);
        vm.expectRevert(ClearedVault.TransferFailed.selector);
        v.approveAndExecute(id);
        require(!v.paidRefs(bytes32(uint256(1))));
        (,, bool executed,) = v.getBatch(id);
        require(!executed);
    }

    function testFuzzNeverExceedsGrant(uint96 amount1, uint96 amount2) public {
        ClearedVault.Item[] memory items = new ClearedVault.Item[](2);
        items[0] = item(1, amount1);
        items[1] = item(2, amount2);
        vm.prank(AGENT);
        uint256 id = vault.stageBatch(items);
        vault.approveAndExecute(id);
        require(token.balanceOf(VENDOR) <= 1e6);
        (,, uint256 spent,,,) = vault.agents(AGENT);
        require(spent == token.balanceOf(VENDOR));
    }
}
