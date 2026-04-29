// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CreditOracle is Ownable {
	struct DefaultRecord {
		uint256 loanId;
		uint256 loanAmount;
		uint256 timestamp;
		bool exists;
	}

	struct CreditData {
		uint256 score;
		uint256 spreadBps;
		uint256 lambdaBps;
		uint256 recoveryBps;
		bool defaulted_;
		uint256 updatedAt;
	}

	uint256 public constant STALE_WINDOW = 2 hours;

	mapping(address => CreditData) public creditByEntity;
	mapping(address => bool) public updaters;
	mapping(address => bool) public authorizedReporters;
	mapping(address => DefaultRecord) public borrowerDefaults;

	event UpdaterSet(address indexed updater, bool allowed);
	event AuthorizedReporterSet(address indexed reporter, bool allowed);
	event LendingDefaultReported(
		address indexed borrower,
		uint256 indexed loanId,
		uint256 loanAmount,
		uint256 timestamp
	);
	event CreditDataUpdated(
		address indexed entity,
		uint256 score,
		uint256 lambdaBps,
		uint256 recoveryBps,
		bool defaulted_
	);

	error NotAuthorizedUpdater();
	error NotAuthorizedReporter();
	error RecoveryOutOfRange();

	constructor(address _owner) Ownable(_owner) {}

	modifier onlyUpdaterOrOwner() {
		_onlyUpdaterOrOwner();
		_;
	}

	modifier onlyAuthorizedReporter() {
		_onlyAuthorizedReporter();
		_;
	}

	function _onlyUpdaterOrOwner() internal view {
		if (msg.sender != owner() && !updaters[msg.sender]) {
			revert NotAuthorizedUpdater();
		}
	}

	function _onlyAuthorizedReporter() internal view {
		if (!authorizedReporters[msg.sender]) {
			revert NotAuthorizedReporter();
		}
	}

	function setUpdater(address updater, bool allowed) external onlyOwner {
		updaters[updater] = allowed;
		emit UpdaterSet(updater, allowed);
	}

	function setAuthorizedReporter(address reporter, bool allowed) external onlyOwner {
		authorizedReporters[reporter] = allowed;
		emit AuthorizedReporterSet(reporter, allowed);
	}

	function setCreditData(address entity, uint256 score, uint256 lambdaBps, uint256 recoveryBps)
		external
		onlyUpdaterOrOwner
	{
		if (recoveryBps > 10_000) revert RecoveryOutOfRange();

		CreditData storage data = creditByEntity[entity];
		data.score = score;
		data.spreadBps = lambdaBps;
		data.lambdaBps = lambdaBps;
		data.recoveryBps = recoveryBps;
		data.updatedAt = block.timestamp;

		emit CreditDataUpdated(entity, score, lambdaBps, recoveryBps, data.defaulted_);
	}

	function markDefaulted(address entity, bool defaulted_) external onlyUpdaterOrOwner {
		CreditData storage data = creditByEntity[entity];
		data.defaulted_ = defaulted_;
		data.updatedAt = block.timestamp;

		emit CreditDataUpdated(entity, data.score, data.lambdaBps, data.recoveryBps, defaulted_);
	}

	function reportLendingDefault(address borrower, uint256 loanId, uint256 loanAmount)
		external
		onlyAuthorizedReporter
	{
		borrowerDefaults[borrower] = DefaultRecord({
			loanId: loanId,
			loanAmount: loanAmount,
			timestamp: block.timestamp,
			exists: true
		});

		CreditData storage data = creditByEntity[borrower];
		data.defaulted_ = true;
		data.updatedAt = block.timestamp;

		emit CreditDataUpdated(borrower, data.score, data.lambdaBps, data.recoveryBps, true);
		emit LendingDefaultReported(borrower, loanId, loanAmount, block.timestamp);
	}

	function getBorrowerDefault(address borrower) external view returns (DefaultRecord memory) {
		return borrowerDefaults[borrower];
	}

	function getCreditData(address entity)
		external
		view
		returns (uint256 score, uint256 lambdaBps, uint256 recoveryBps, bool defaulted_)
	{
		CreditData memory data = creditByEntity[entity];
		return (data.score, data.lambdaBps, data.recoveryBps, data.defaulted_);
	}

	function getRecoveryBps(address entity) external view returns (uint256) {
		return creditByEntity[entity].recoveryBps;
	}

	function getSpread(address entity) external view returns (uint256 spreadBps) {
		return creditByEntity[entity].spreadBps;
	}

	function getCreditScore(address entity) external view returns (uint256 score) {
		return creditByEntity[entity].score;
	}

	function isCreditEventDeclared(address entity) external view returns (bool) {
		return creditByEntity[entity].defaulted_;
	}

	function getHazardRate(address entity) external view returns (uint256 lambda) {
		return creditByEntity[entity].lambdaBps;
	}

	function isStale(address entity) external view returns (bool) {
		uint256 updatedAt = creditByEntity[entity].updatedAt;
		if (updatedAt == 0) return true;
		return block.timestamp > updatedAt + STALE_WINDOW;
	}
}

