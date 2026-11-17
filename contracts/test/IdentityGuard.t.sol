// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {PayeeRegistry} from "../src/PayeeRegistry.sol";
import {Checkout} from "../src/Checkout.sol";
import {MockUSD8} from "../src/MockUSD8.sol";
import {IUSD8} from "../src/ClearedVault.sol";
import {ClearedGuard, IClearedRegistry} from "../../packages/cleared-guard/src/ClearedGuard.sol";
import {Vm} from "./ClearedVault.t.sol";
import {SampleAddresses} from "./SampleAddresses.sol";

contract IdentityGuardTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant VENDOR = SampleAddresses.KOPI_PAGI;
    IdentityRegistry identity;
    PayeeRegistry registry;
    MockUSD8 token;
    Checkout checkout;

    function setUp() public {
        identity = new IdentityRegistry(address(this));
        registry = new PayeeRegistry(address(this));
        token = new MockUSD8();
        checkout = new Checkout(IClearedRegistry(address(registry)), IUSD8(address(token)));
        registry.registerWithMetadata("Contractor", VENDOR, bytes32(0), "ipfs://contractor");
        token.mint(address(this), 1e6);
        token.approve(address(checkout), 1e6);
    }

    function testIdentityResolvesAddressAndURI() public {
        uint256 id = identity.register(VENDOR, "ipfs://agent");
        (address account, string memory uri, uint64 revision) = identity.resolve(id);
        require(account == VENDOR && keccak256(bytes(uri)) == keccak256("ipfs://agent") && revision == 1);
    }

    function testIdentityAddressRevision() public {
        uint256 id = identity.register(VENDOR, "ipfs://agent");
        identity.update(id, address(0x456), "ipfs://new");
        (address account,, uint64 revision) = identity.resolve(id);
        require(account == address(0x456) && revision == 2);
    }

    function testIdentityMetadataPreservesRevision() public {
        uint256 id = identity.register(VENDOR, "ipfs://agent");
        identity.update(id, VENDOR, "ipfs://new");
        (,, uint64 revision) = identity.resolve(id);
        require(revision == 1);
    }

    function testOnlyOwnerRegistersIdentity() public {
        vm.prank(VENDOR);
        vm.expectRevert(IdentityRegistry.Unauthorized.selector);
        identity.register(VENDOR, "");
    }

    function testOnlyOwnerUpdatesIdentity() public {
        uint256 id = identity.register(VENDOR, "");
        vm.prank(VENDOR);
        vm.expectRevert(IdentityRegistry.Unauthorized.selector);
        identity.update(id, VENDOR, "");
    }

    function testRejectsZeroIdentityAddress() public {
        vm.expectRevert(IdentityRegistry.InvalidIdentity.selector);
        identity.register(address(0), "");
    }

    function testRejectsUnknownIdentityUpdate() public {
        vm.expectRevert(IdentityRegistry.InvalidIdentity.selector);
        identity.update(99, VENDOR, "");
    }

    function testPayeeRegistryUsesIdentity() public view {
        (,, uint256 id,) = registry.payees(keccak256("Contractor"));
        (address account, string memory uri,) = registry.identityRegistry().resolve(id);
        require(account == VENDOR && keccak256(bytes(uri)) == keccak256("ipfs://contractor"));
    }

    function testRegisterAgentIdentity() public {
        uint256 id = registry.registerAgent(VENDOR, "ipfs://treasury-agent");
        (address account,,) = registry.identityRegistry().resolve(id);
        require(account == VENDOR);
    }

    function testCannotBypassPayeeRegistryToChangeIdentity() public {
        IdentityRegistry canonical = registry.identityRegistry();
        vm.expectRevert(IdentityRegistry.Unauthorized.selector);
        canonical.update(1, address(0x456), "");
    }

    function testCheckoutPaysVerifiedPayee() public {
        checkout.pay("Contractor", VENDOR, 123456);
        require(token.balanceOf(VENDOR) == 123456);
    }

    function testCheckoutRejectsLookalike() public {
        vm.expectRevert(ClearedGuard.UnclearedPayee.selector);
        checkout.pay("Contractor", SampleAddresses.KOPI_PAGI_LOOKALIKE_1, 1);
        require(token.balanceOf(SampleAddresses.KOPI_PAGI_LOOKALIKE_1) == 0);
    }

    function testCheckoutRechecksRemoval() public {
        registry.remove("Contractor");
        vm.expectRevert(ClearedGuard.UnclearedPayee.selector);
        checkout.pay("Contractor", VENDOR, 1);
    }

    function testCheckoutRechecksChangedAddress() public {
        registry.register("Contractor", address(0x456), bytes32(0));
        vm.expectRevert(ClearedGuard.UnclearedPayee.selector);
        checkout.pay("Contractor", VENDOR, 1);
    }

    function testCheckoutRequiresAllowance() public {
        token.approve(address(checkout), 0);
        vm.expectRevert();
        checkout.pay("Contractor", VENDOR, 1);
    }
}
