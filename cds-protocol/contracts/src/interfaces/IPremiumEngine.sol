// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPremiumEngine {
	function initializePosition(uint256 positionId) external;

    function accrueAndCollect(uint256 positionId) external returns (uint256 premiumDue);
    function getPremiumDue(uint256 positionId) external view returns (uint256 premiumDue);
}
