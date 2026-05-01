// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SpreadMath} from "../../src/libraries/SpreadMath.sol";

contract SpreadMathHarness {
	function premium(uint256 n, uint256 s, uint256 d) external pure returns (uint256) {
		return SpreadMath.computePremium(n, s, d);
	}

	function payout(uint256 n, uint256 r) external pure returns (uint256) {
		return SpreadMath.computePayout(n, r);
	}

	function ratio(uint256 c, uint256 n) external pure returns (uint256) {
		return SpreadMath.computeCollateralRatio(c, n);
	}
}

contract SpreadMathTest is Test {
	SpreadMathHarness internal h;

	function setUp() external {
		h = new SpreadMathHarness();
	}

	function testComputePremiumQuarterly() external view {
		uint256 p = h.premium(100_000e6, 100, 90);
		assertEq(p, 250e6);
	}

	function testComputePayoutAt40Recovery() external view {
		uint256 out = h.payout(50_000e6, 4_000);
		assertEq(out, 30_000e6);
	}

	function testComputeCollateralRatio() external view {
		uint256 r = h.ratio(120_000e6, 100_000e6);
		assertEq(r, 12_000);
	}
}
