// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CommitteeOracle is Ownable {
	struct Decision {
		uint256 approvals;
		bool executed;
	}

	mapping(address => bool) public isSigner;
	mapping(address => bool) public defaultedByEntity;
	mapping(address => uint256) public recoveryBpsByEntity;

	mapping(bytes32 => Decision) public decisions;
	mapping(bytes32 => mapping(address => bool)) public voted;

	uint256 public quorum;

	event SignerSet(address indexed signer, bool enabled);
	event QuorumUpdated(uint256 quorum);
	event CreditEventApproved(address indexed entity, uint256 recoveryBps, address indexed signer);
	event CreditEventExecuted(address indexed entity, uint256 recoveryBps);

	error NotSigner();
	error AlreadyVoted();
	error InvalidQuorum();
	error RecoveryOutOfRange();

	constructor(address[] memory signers, uint256 quorum_, address owner_) Ownable(owner_) {
		if (quorum_ == 0 || quorum_ > signers.length) revert InvalidQuorum();
		quorum = quorum_;

		for (uint256 i = 0; i < signers.length; i++) {
			isSigner[signers[i]] = true;
			emit SignerSet(signers[i], true);
		}
	}

	modifier onlySigner() {
		_onlySigner();
		_;
	}

	function _onlySigner() internal view {
		if (!isSigner[msg.sender]) revert NotSigner();
	}

	function setSigner(address signer, bool enabled) external onlyOwner {
		isSigner[signer] = enabled;
		emit SignerSet(signer, enabled);
	}

	function setQuorum(uint256 quorum_) external onlyOwner {
		if (quorum_ == 0) revert InvalidQuorum();
		quorum = quorum_;
		emit QuorumUpdated(quorum_);
	}

	function approveCreditEvent(address entity, uint256 recoveryBps) external onlySigner {
		if (recoveryBps > 10_000) revert RecoveryOutOfRange();

		// forge-lint: disable-next-line(asm-keccak256)
		bytes32 key = keccak256(abi.encode(entity, recoveryBps));
		if (voted[key][msg.sender]) revert AlreadyVoted();

		voted[key][msg.sender] = true;
		decisions[key].approvals += 1;

		emit CreditEventApproved(entity, recoveryBps, msg.sender);

		if (!decisions[key].executed && decisions[key].approvals >= quorum) {
			decisions[key].executed = true;
			defaultedByEntity[entity] = true;
			recoveryBpsByEntity[entity] = recoveryBps;
			emit CreditEventExecuted(entity, recoveryBps);
		}
	}

	function isDefaulted(address entity) external view returns (bool) {
		return defaultedByEntity[entity];
	}

	function getRecoveryBps(address entity) external view returns (uint256) {
		return recoveryBpsByEntity[entity];
	}
}

