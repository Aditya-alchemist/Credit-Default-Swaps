// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILendingToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}
