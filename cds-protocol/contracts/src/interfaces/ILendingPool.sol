// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILendingPool {
	function deposit(uint256 amount) external returns (uint256 supplyId);
	function withdraw(uint256 supplyId, uint256 lTokenAmount) external returns (uint256 usdcOut);
	function borrow(uint256 collateralAmount, uint256 loanAmount, uint256 duration)
		external
		returns (uint256 loanId);
	function repay(uint256 loanId) external;
	function liquidate(uint256 loanId) external;
	function getHealthFactor(uint256 loanId) external view returns (uint256 hfBps);
	function getAvailableLiquidity() external view returns (uint256);
}

