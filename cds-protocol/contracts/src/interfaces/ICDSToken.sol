// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICDSToken {
    function mintPosition(address buyer, address seller, uint256 positionId) external;
    function burnPosition(uint256 positionId) external;
}