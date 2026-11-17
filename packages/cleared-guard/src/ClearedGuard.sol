// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IClearedRegistry {
    function isVerified(string calldata name, address account) external view returns (bool);
}

abstract contract ClearedGuard {
    IClearedRegistry public immutable clearedRegistry;

    error UnclearedPayee();

    constructor(IClearedRegistry registry_) {
        require(address(registry_) != address(0), "Invalid registry");
        clearedRegistry = registry_;
    }

    modifier onlyClearedPayee(string memory name, address account) {
        if (!clearedRegistry.isVerified(name, account)) revert UnclearedPayee();
        _;
    }
}
