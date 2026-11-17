// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IdentityRegistry} from "./IdentityRegistry.sol";

/// Names are exact UTF-8 bytes. Display normalization must never silently change identity.
contract PayeeRegistry {
    address public immutable owner;
    IdentityRegistry public immutable identityRegistry;
    uint256 public constant trustDelay = 1 days;

    struct Payee {
        address account;
        bytes32 documentHash;
        uint256 identityId;
        uint256 verifiedAt;
    }

    mapping(bytes32 => Payee) public payees;

    error Unauthorized();
    error InvalidPayee();

    event Registered(string name, address indexed account, bytes32 documentHash);
    event Removed(string name);

    constructor(address owner_) {
        if (owner_ == address(0)) revert InvalidPayee();
        owner = owner_;
        identityRegistry = new IdentityRegistry(address(this));
    }

    function register(string calldata name, address account, bytes32 documentHash) external {
        _register(name, account, documentHash, "");
    }

    function registerWithMetadata(string calldata name, address account, bytes32 documentHash, string calldata uri)
        external
        returns (uint256)
    {
        return _register(name, account, documentHash, uri);
    }

    function registerAgent(address account, string calldata uri) external returns (uint256) {
        if (msg.sender != owner) revert Unauthorized();
        return identityRegistry.register(account, uri);
    }

    function _register(string calldata name, address account, bytes32 documentHash, string memory uri)
        private
        returns (uint256)
    {
        if (msg.sender != owner) revert Unauthorized();
        if (bytes(name).length == 0 || bytes(name).length > 160 || account == address(0)) revert InvalidPayee();
        Payee storage p = payees[keccak256(bytes(name))];
        if (p.identityId == 0) p.identityId = identityRegistry.register(account, uri);
        else identityRegistry.update(p.identityId, account, uri);
        if (p.account != account) p.verifiedAt = block.timestamp;
        p.account = account;
        p.documentHash = documentHash;
        emit Registered(name, account, documentHash);
        return p.identityId;
    }

    function remove(string calldata name) external {
        if (msg.sender != owner) revert Unauthorized();
        Payee storage p = payees[keccak256(bytes(name))];
        p.account = address(0);
        p.verifiedAt = 0;
        emit Removed(name);
    }

    function isVerified(string calldata name, address account) public view returns (bool) {
        Payee storage p = payees[keccak256(bytes(name))];
        (address canonical,,) = identityRegistry.resolve(p.identityId);
        return account != address(0) && p.account == account && canonical == account;
    }

    function holdRemaining(string calldata name, address account) external view returns (uint256) {
        if (!isVerified(name, account)) return trustDelay;
        uint256 ready = payees[keccak256(bytes(name))].verifiedAt + trustDelay;
        return block.timestamp < ready ? ready - block.timestamp : 0;
    }
}
