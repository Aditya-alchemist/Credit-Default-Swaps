// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICDSVault {
	enum PositionState {
		ACTIVE,
		MARGIN_CALL,
		DEFAULTED,
		EXPIRED
	}

	// forge-lint: disable-next-line(pascal-case-struct)
	struct CDSPosition {
		address buyer;
		address seller;
		address referenceEntity;
		uint256 notional;
		uint256 spreadBps;
		uint256 collateral;
		uint256 maturity;
		uint256 openTimestamp;
		uint256 lastPremiumPaid;
		PositionState state;
	}

	// forge-lint: disable-next-line(mixed-case-function)
	function openCDS(
		address buyer,
		address referenceEntity,
		uint256 notional,
		uint256 spreadBps,
		uint256 maturityDays
	) external returns (uint256 positionId);

	function executePayout(uint256 positionId, uint256 recoveryBps) external;
	function setMarginCall(uint256 positionId) external;
	function updateLastPremiumPaid(uint256 positionId, uint256 timestamp) external;
	function getPosition(uint256 positionId) external view returns (CDSPosition memory);
	function isActive(uint256 positionId) external view returns (bool);
	function getCollateralRatio(uint256 positionId) external view returns (uint256 ratioBps);
}
