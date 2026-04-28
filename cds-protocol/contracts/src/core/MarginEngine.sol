// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICDSVault} from "../interfaces/ICDSVault.sol";
import {ICreditOracle} from "../interfaces/ICreditOracle.sol";
import {SpreadMath} from "../libraries/SpreadMath.sol";

contract MarginEngine is Ownable {
	// forge-lint: disable-next-line(screaming-snake-case-immutable)
	ICDSVault public immutable cdsVault;
	// forge-lint: disable-next-line(screaming-snake-case-immutable)
	ICreditOracle public immutable creditOracle;

	uint256 public constant MIN_COLLATERAL_RATIO_BPS = 12000;
	uint256 public constant COLLATERAL_FACTOR_BPS = 8000;
	uint256 public constant MARGIN_CALL_WINDOW = 4 hours;

	mapping(uint256 => uint256) public marginCallTimestamp;

event MarginCallIssued(
	uint256 indexed positionId,
	uint256 currentRatioBps,
	uint256 requiredRatioBps,
	uint256 deadline
);
	event MarginCallResolved(uint256 indexed positionId, uint256 newRatioBps);
	event PositionLiquidated(uint256 indexed positionId, uint256 collateralRatioBps, uint256 timestamp);

	error MarginCallWindowNotExpired(uint256 positionId, uint256 deadline);
	error NoMarginCallActive(uint256 positionId);
	error ZeroAddress();

	constructor(address _cdsVault, address _creditOracle, address _owner) Ownable(_owner) {
		if (_cdsVault == address(0)) revert ZeroAddress();
		if (_creditOracle == address(0)) revert ZeroAddress();
		cdsVault = ICDSVault(_cdsVault);
		creditOracle = ICreditOracle(_creditOracle);
	}

	function checkMargin(uint256 positionId) public {
		if (!cdsVault.isActive(positionId)) return;

		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);
		uint256 currentSpread = creditOracle.getSpread(pos.referenceEntity);

		uint256 daysRemaining = 0;
		if (pos.maturity > block.timestamp) {
			daysRemaining = (pos.maturity - block.timestamp) / 1 days;
		}

		uint256 pv01 = SpreadMath.computePV01(pos.notional, daysRemaining);
		uint256 mtm = SpreadMath.computeMtM(currentSpread, pos.spreadBps, pv01);
		uint256 totalExposure = pos.notional + mtm;
		uint256 ratioBps = SpreadMath.computeCollateralRatio(pos.collateral, totalExposure);

		if (ratioBps < MIN_COLLATERAL_RATIO_BPS) {
			if (marginCallTimestamp[positionId] == 0) {
				marginCallTimestamp[positionId] = block.timestamp;
				cdsVault.setMarginCall(positionId);
				emit MarginCallIssued(
					positionId,
					ratioBps,
					MIN_COLLATERAL_RATIO_BPS,
					block.timestamp + MARGIN_CALL_WINDOW
				);
			}
		} else {
			if (marginCallTimestamp[positionId] != 0) {
				marginCallTimestamp[positionId] = 0;
				emit MarginCallResolved(positionId, ratioBps);
			}
		}
	}

	function liquidatePosition(uint256 positionId) external {
		uint256 callTime = marginCallTimestamp[positionId];
		if (callTime == 0) revert NoMarginCallActive(positionId);
		if (block.timestamp < callTime + MARGIN_CALL_WINDOW) {
			revert MarginCallWindowNotExpired(positionId, callTime + MARGIN_CALL_WINDOW);
		}

		uint256 ratioBeforeLiquidation = computeCurrentRatio(positionId);
		marginCallTimestamp[positionId] = 0;
		cdsVault.executePayout(positionId, 4000);

		emit PositionLiquidated(positionId, ratioBeforeLiquidation, block.timestamp);
	}

	function computeMtM(uint256 positionId) external view returns (uint256 mtm) {
		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);
		uint256 currentSpread = creditOracle.getSpread(pos.referenceEntity);

		uint256 daysRemaining = 0;
		if (pos.maturity > block.timestamp) {
			daysRemaining = (pos.maturity - block.timestamp) / 1 days;
		}

		uint256 pv01 = SpreadMath.computePV01(pos.notional, daysRemaining);
		mtm = SpreadMath.computeMtM(currentSpread, pos.spreadBps, pv01);
	}

	function computeCurrentRatio(uint256 positionId) public view returns (uint256 ratioBps) {
		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);
		uint256 currentSpread = creditOracle.getSpread(pos.referenceEntity);

		uint256 daysRemaining = 0;
		if (pos.maturity > block.timestamp) {
			daysRemaining = (pos.maturity - block.timestamp) / 1 days;
		}
		uint256 pv01 = SpreadMath.computePV01(pos.notional, daysRemaining);
		uint256 mtm = SpreadMath.computeMtM(currentSpread, pos.spreadBps, pv01);
		ratioBps = SpreadMath.computeCollateralRatio(pos.collateral, pos.notional + mtm);
	}

	function isUnderwater(uint256 positionId) external view returns (bool) {
		return computeCurrentRatio(positionId) < MIN_COLLATERAL_RATIO_BPS;
	}

	function getMarginCallDeadline(uint256 positionId) external view returns (uint256) {
		uint256 callTime = marginCallTimestamp[positionId];
		if (callTime == 0) return 0;
		return callTime + MARGIN_CALL_WINDOW;
	}

	// Backward compatibility for existing IMarginEngine wiring.
	function checkAndFlag(uint256 positionId) external returns (bool flagged) {
		uint256 beforeTs = marginCallTimestamp[positionId];
		checkMargin(positionId);
		return beforeTs == 0 && marginCallTimestamp[positionId] != 0;
	}

	function maintenanceRatioBps() external pure returns (uint256) {
		return MIN_COLLATERAL_RATIO_BPS;
	}
}

