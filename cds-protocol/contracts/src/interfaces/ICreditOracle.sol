// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICreditOracle {
	function getSpread(address entity) external view returns (uint256 spreadBps);
	function getCreditScore(address entity) external view returns (uint256 score);
	function isCreditEventDeclared(address entity) external view returns (bool);
	function getHazardRate(address entity) external view returns (uint256 lambda);
	function isStale(address entity) external view returns (bool);

	function setCreditData(address entity, uint256 score, uint256 lambdaBps, uint256 recoveryBps) external;
	function markDefaulted(address entity, bool defaulted_) external;
	function getCreditData(address entity)
		external
		view
		returns (uint256 score, uint256 lambdaBps, uint256 recoveryBps, bool defaulted_);
	function getRecoveryBps(address entity) external view returns (uint256);
}

