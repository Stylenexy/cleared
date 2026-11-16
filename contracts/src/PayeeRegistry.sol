// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// Names are exact UTF-8 bytes. Display normalization must never silently change identity.
contract PayeeRegistry {
    address public immutable owner;

    struct Payee {
        address account;
        bytes32 documentHash;
    }

    mapping(bytes32 => Payee) public payees;

    error Unauthorized();
    error InvalidPayee();

    event Registered(string name, address indexed account, bytes32 documentHash);
    event Removed(string name);

    constructor(address owner_) {
        if (owner_ == address(0)) revert InvalidPayee();
        owner = owner_;
    }

    function register(string calldata name, address account, bytes32 documentHash) external {
        if (msg.sender != owner) revert Unauthorized();
        if (bytes(name).length == 0 || bytes(name).length > 160 || account == address(0)) revert InvalidPayee();
        payees[keccak256(bytes(name))] = Payee(account, documentHash);
        emit Registered(name, account, documentHash);
    }

    function remove(string calldata name) external {
        if (msg.sender != owner) revert Unauthorized();
        delete payees[keccak256(bytes(name))];
        emit Removed(name);
    }

    function isVerified(string calldata name, address account) external view returns (bool) {
        return account != address(0) && payees[keccak256(bytes(name))].account == account;
    }
}
