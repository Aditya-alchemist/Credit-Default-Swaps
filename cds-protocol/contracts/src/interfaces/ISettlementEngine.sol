// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISettlementEngine {
	function markCreditEvent(address referenceEntity, uint256 recoveryBps) external;
	function settlePosition(uint256 positionId) external;
	function hasCreditEvent(address referenceEntity) external view returns (bool);
	function getRecoveryBps(address referenceEntity) external view returns (uint256);
}

