// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ClearedGuard, IClearedRegistry} from "../../packages/cleared-guard/src/ClearedGuard.sol";
import {IUSD8} from "./ClearedVault.sol";

/// Explicit user-paid checkout example. Treasury autonomy belongs in ClearedVault.
contract Checkout is ClearedGuard {
    IUSD8 public immutable token;

    event CheckedOut(address indexed payer, address indexed payee, uint256 amount);

    constructor(IClearedRegistry registry_, IUSD8 token_) ClearedGuard(registry_) {
        require(token_.decimals() == 6, "Six decimals required");
        token = token_;
    }

    function pay(string calldata name, address payee, uint256 amount) external onlyClearedPayee(name, payee) {
        require(amount > 0, "Positive amount required");
        require(token.transferFrom(msg.sender, payee, amount), "Transfer failed");
        emit CheckedOut(msg.sender, payee, amount);
    }
}
