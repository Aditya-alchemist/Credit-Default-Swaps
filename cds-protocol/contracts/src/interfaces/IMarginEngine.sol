// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMarginEngine {
    function checkAndFlag(uint256 positionId) external returns (bool flagged);
    function maintenanceRatioBps() external view returns (uint256);
}
