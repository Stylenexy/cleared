// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PayeeRegistry} from "./PayeeRegistry.sol";

interface IUSD8 {
    function decimals() external view returns (uint8);
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

contract PagarVault {
    address public immutable owner;
    IUSD8 public immutable token;
    PayeeRegistry public immutable registry;
    uint256 public nextBatchId = 1;
    uint256 private entered;
    uint256 public constant MAX_ITEMS = 50;

    struct Agent {
        uint256 totalLimit;
        uint256 perItemLimit;
        uint256 spent;
        uint64 expiresAt;
        uint64 version;
        bool revoked;
    }

    struct Item {
        bytes32 ref;
        string name;
        address payee;
        uint256 amount;
        bytes32 invoiceHash;
    }

    struct Batch {
        address agent;
        uint64 version;
        bool executed;
        Item[] items;
    }

    enum Reason {
        None,
        NameMismatch,
        PerItemLimit,
        TotalLimit,
        Expired,
        Revoked,
        DuplicateRef,
        InvalidItem,
        InsufficientBalance
    }

    mapping(address => Agent) public agents;
    mapping(uint256 => Batch) private batches;
    mapping(bytes32 => bool) public paidRefs;

    error Unauthorized();
    error InvalidConfig();
    error InvalidBatch();
    error TransferFailed();
    error Reentrancy();

    event AgentConfigured(address indexed agent, uint64 version);
    event AgentRevoked(address indexed agent);
    event Staged(uint256 indexed batchId, address indexed agent, uint256 count);
    event Paid(
        uint256 indexed batchId, bytes32 indexed ref, address indexed payee, uint256 amount, bytes32 invoiceHash
    );
    event Rejected(uint256 indexed batchId, bytes32 indexed ref, Reason reason);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier locked() {
        if (entered != 0) revert Reentrancy();
        entered = 1;
        _;
        entered = 0;
    }

    constructor(address owner_, IUSD8 token_, PayeeRegistry registry_) {
        if (owner_ == address(0) || address(registry_) == address(0) || token_.decimals() != 6) revert InvalidConfig();
        owner = owner_;
        token = token_;
        registry = registry_;
    }

    function configureAgent(address agent, uint256 total, uint256 perItem, uint64 expiresAt) external onlyOwner {
        if (agent == address(0) || agent == owner || perItem == 0 || total < perItem || expiresAt <= block.timestamp) {
            revert InvalidConfig();
        }
        uint64 version = agents[agent].version + 1;
        // A new grant invalidates every pending batch from the previous grant.
        agents[agent] = Agent(total, perItem, 0, expiresAt, version, false);
        emit AgentConfigured(agent, version);
    }

    function revokeAgent(address agent) external onlyOwner {
        agents[agent].revoked = true;
        emit AgentRevoked(agent);
    }

    function deposit(uint256 amount) external onlyOwner locked {
        if (amount == 0) revert InvalidConfig();
        _transfer(abi.encodeCall(token.transferFrom, (msg.sender, address(this), amount)));
    }

    function withdraw(uint256 amount) external onlyOwner locked {
        _transfer(abi.encodeCall(token.transfer, (owner, amount)));
    }

    function stageBatch(Item[] calldata items) external returns (uint256 id) {
        Agent storage agent = agents[msg.sender];
        if (agent.version == 0 || agent.revoked || block.timestamp >= agent.expiresAt) revert Unauthorized();
        if (items.length == 0 || items.length > MAX_ITEMS) revert InvalidBatch();
        id = nextBatchId++;
        Batch storage batch = batches[id];
        batch.agent = msg.sender;
        batch.version = agent.version;
        for (uint256 i; i < items.length; ++i) {
            if (bytes(items[i].name).length > 160) revert InvalidBatch();
            batch.items.push(items[i]);
        }
        emit Staged(id, msg.sender, items.length);
    }

    function getBatch(uint256 id)
        external
        view
        returns (address agent, uint64 version, bool executed, Item[] memory items)
    {
        Batch storage b = batches[id];
        return (b.agent, b.version, b.executed, b.items);
    }

    function approveAndExecute(uint256 id) external onlyOwner locked {
        Batch storage batch = batches[id];
        if (batch.agent == address(0) || batch.executed) revert InvalidBatch();
        batch.executed = true;
        Agent storage agent = agents[batch.agent];
        for (uint256 i; i < batch.items.length; ++i) {
            Item storage item = batch.items[i];
            Reason reason = _reason(item, agent, batch.version);
            if (reason != Reason.None) {
                emit Rejected(id, item.ref, reason);
                continue;
            }
            paidRefs[item.ref] = true;
            agent.spent += item.amount;
            _transfer(abi.encodeCall(token.transfer, (item.payee, item.amount)));
            emit Paid(id, item.ref, item.payee, item.amount, item.invoiceHash);
        }
    }

    function _reason(Item storage item, Agent storage agent, uint64 version) private view returns (Reason) {
        if (agent.revoked || agent.version != version) return Reason.Revoked;
        if (block.timestamp >= agent.expiresAt) return Reason.Expired;
        if (item.ref == bytes32(0) || item.invoiceHash == bytes32(0) || item.amount == 0) return Reason.InvalidItem;
        if (paidRefs[item.ref]) return Reason.DuplicateRef;
        if (!registry.isVerified(item.name, item.payee)) return Reason.NameMismatch;
        if (item.amount > agent.perItemLimit) return Reason.PerItemLimit;
        if (item.amount > agent.totalLimit - agent.spent) return Reason.TotalLimit;
        if (item.amount > token.balanceOf(address(this))) return Reason.InsufficientBalance;
        return Reason.None;
    }

    function _transfer(bytes memory data) private {
        (bool ok, bytes memory result) = address(token).call(data);
        if (!ok || (result.length != 0 && !abi.decode(result, (bool)))) revert TransferFailed();
    }
}
