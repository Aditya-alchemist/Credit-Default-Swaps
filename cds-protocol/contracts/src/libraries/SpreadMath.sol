// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library SpreadMath {
	uint256 internal constant BPS_DENOMINATOR = 10_000;

	function computePremium(uint256 notional, uint256 spreadBps, uint256 daysElapsed)
		internal
		pure
		returns (uint256)
	{
		return (notional * spreadBps * daysElapsed) / (BPS_DENOMINATOR * 360);
	}

	function computeInterest(uint256 principal, uint256 rateBps, uint256 secondsElapsed)
		internal
		pure
		returns (uint256)
	{
		return (principal * rateBps * secondsElapsed) / (BPS_DENOMINATOR * 365 days);
	}

	function computePayout(uint256 notional, uint256 recoveryBps) internal pure returns (uint256) {
		if (recoveryBps > BPS_DENOMINATOR) {
			return 0;
		}
		return (notional * (BPS_DENOMINATOR - recoveryBps)) / BPS_DENOMINATOR;
	}

	// forge-lint: disable-next-line(mixed-case-function)
	function computePV01(uint256 notional, uint256 daysRemaining)
		internal
		pure
		returns (uint256)
	{
		return (notional * daysRemaining) / (BPS_DENOMINATOR * 360);
	}

	function computeMtM(uint256 currentSpreadBps, uint256 entrySpreadBps, uint256 pv01)
		internal
		pure
		returns (uint256)
	{
		if (currentSpreadBps <= entrySpreadBps) return 0;
		return ((currentSpreadBps - entrySpreadBps) * pv01) / BPS_DENOMINATOR;
	}

	function computeCollateralRatio(uint256 collateral, uint256 notional)
		internal
		pure
		returns (uint256)
	{
		if (notional == 0) return type(uint256).max;
		return (collateral * BPS_DENOMINATOR) / notional;
	}

	function computeHealthFactor(uint256 collateralUsd, uint256 collateralFactorBps, uint256 totalOwed)
		internal
		pure
		returns (uint256)
	{
		if (totalOwed == 0) return type(uint256).max;
		return (collateralUsd * collateralFactorBps) / totalOwed;
	}
}

