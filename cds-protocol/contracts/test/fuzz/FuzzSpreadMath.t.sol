// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SpreadMath} from "../../src/libraries/SpreadMath.sol";

contract FuzzSpreadMathTest is Test {
	function testFuzz_PayoutNeverExceedsNotional(uint96 notionalRaw, uint16 recoveryRaw) external pure {
		uint256 notional = uint256(notionalRaw) + 1;
		uint256 recoveryBps = uint256(recoveryRaw) % 10_001;

		uint256 payout = SpreadMath.computePayout(notional, recoveryBps);

		assertLe(payout, notional);
	}

	function testFuzz_HigherRecoveryMeansLowerOrEqualPayout(
		uint96 notionalRaw,
		uint16 recoveryA,
		uint16 recoveryB
	) external pure {
		uint256 notional = uint256(notionalRaw) + 1;
		uint256 r1 = uint256(recoveryA) % 10_001;
		uint256 r2 = uint256(recoveryB) % 10_001;

		if (r1 > r2) {
			(r1, r2) = (r2, r1);
		}

		uint256 payoutLowRecovery = SpreadMath.computePayout(notional, r1);
		uint256 payoutHighRecovery = SpreadMath.computePayout(notional, r2);

		assertGe(payoutLowRecovery, payoutHighRecovery);
	}
}
