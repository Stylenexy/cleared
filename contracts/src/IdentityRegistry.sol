// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// Minimal ERC-8004-style directory, not a complete ERC-721/ERC-8004 implementation.
contract IdentityRegistry {
    address public immutable owner;
    uint256 public nextId = 1;

    struct Identity {
        address account;
        string metadataURI;
        uint64 revision;
    }

    mapping(uint256 => Identity) private identities;

    error Unauthorized();
    error InvalidIdentity();

    event Registered(uint256 indexed id, address indexed account, string metadataURI);
    event Updated(uint256 indexed id, address indexed account, string metadataURI, uint64 revision);

    constructor(address owner_) {
        if (owner_ == address(0)) revert InvalidIdentity();
        owner = owner_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function register(address account, string calldata metadataURI) external onlyOwner returns (uint256 id) {
        if (account == address(0) || bytes(metadataURI).length > 2048) revert InvalidIdentity();
        id = nextId++;
        identities[id] = Identity(account, metadataURI, 1);
        emit Registered(id, account, metadataURI);
    }

    function update(uint256 id, address account, string calldata metadataURI) external onlyOwner {
        Identity storage identity = identities[id];
        if (identity.revision == 0 || account == address(0) || bytes(metadataURI).length > 2048) {
            revert InvalidIdentity();
        }
        if (identity.account != account) ++identity.revision;
        identity.account = account;
        identity.metadataURI = metadataURI;
        emit Updated(id, account, metadataURI, identity.revision);
    }

    function resolve(uint256 id) external view returns (address account, string memory metadataURI, uint64 revision) {
        Identity storage identity = identities[id];
        return (identity.account, identity.metadataURI, identity.revision);
    }
}
