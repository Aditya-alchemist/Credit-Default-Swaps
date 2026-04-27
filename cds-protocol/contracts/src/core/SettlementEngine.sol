// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICDSVault} from "../interfaces/ICDSVault.sol";
import {ICreditOracle} from "../interfaces/ICreditOracle.sol";
import {SpreadMath} from "../libraries/SpreadMath.sol";

contract SettlementEngine is ReentrancyGuard, Ownable {
	// forge-lint: disable-next-line(screaming-snake-case-immutable)
	ICDSVault public immutable cdsVault;
	// forge-lint: disable-next-line(screaming-snake-case-immutable)
	ICreditOracle public immutable creditOracle;
	uint256 public constant DEFAULT_RECOVERY_BPS = 4000;

	mapping(address => uint256) public entityRecoveryBps;

	struct SettlementRecord {
		uint256 positionId;
		address buyer;
		address seller;
		uint256 notional;
		uint256 payout;
		uint256 surplus;
		uint256 recoveryBps;
		uint256 settledAt;
	}

	mapping(uint256 => SettlementRecord) public settlementRecords;
	uint256 public totalPayoutsExecuted;
	uint256 public totalPayoutAmount;

event CreditEventSettled(
	uint256 indexed positionId,
	address indexed buyer,
	address indexed seller,
	uint256 notional,
	uint256 payout,
	uint256 surplus,
	uint256 recoveryBps
);
	event RecoveryRateSet(address indexed entity, uint256 recoveryBps);

error CreditEventNotDeclared(address entity);
	error PositionNotActive(uint256 positionId);
	error AlreadySettled(uint256 positionId);
	error ZeroAddress();
	error InvalidRecoveryRate(uint256 recoveryBps);

	constructor(address _cdsVault, address _creditOracle, address _owner) Ownable(_owner) {
		if (_cdsVault == address(0)) revert ZeroAddress();
		if (_creditOracle == address(0)) revert ZeroAddress();
		cdsVault = ICDSVault(_cdsVault);
		creditOracle = ICreditOracle(_creditOracle);
	}

	// forge-lint: disable-next-line(mixed-case-function)
	function settleCDS(uint256 positionId) public nonReentrant {
		if (settlementRecords[positionId].settledAt != 0) revert AlreadySettled(positionId);
		if (!cdsVault.isActive(positionId)) revert PositionNotActive(positionId);

		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);
		if (!creditOracle.isCreditEventDeclared(pos.referenceEntity)) {
			revert CreditEventNotDeclared(pos.referenceEntity);
		}

		uint256 recoveryBps = entityRecoveryBps[pos.referenceEntity] != 0
			? entityRecoveryBps[pos.referenceEntity]
			: DEFAULT_RECOVERY_BPS;

		uint256 payout = SpreadMath.computePayout(pos.notional, recoveryBps);
		uint256 surplus = pos.collateral > payout ? pos.collateral - payout : 0;

		settlementRecords[positionId] = SettlementRecord({
			positionId: positionId,
			buyer: pos.buyer,
			seller: pos.seller,
			notional: pos.notional,
			payout: payout,
			surplus: surplus,
			recoveryBps: recoveryBps,
			settledAt: block.timestamp
		});

		totalPayoutsExecuted++;
		totalPayoutAmount += payout;

		cdsVault.executePayout(positionId, recoveryBps);

		emit CreditEventSettled(
			positionId,
			pos.buyer,
			pos.seller,
			pos.notional,
			payout,
			surplus,
			recoveryBps
		);
	}

	// forge-lint: disable-next-line(mixed-case-function)
	function batchSettleCDS(uint256[] calldata positionIds) external nonReentrant {
		for (uint256 i = 0; i < positionIds.length; i++) {
			uint256 positionId = positionIds[i];

			if (settlementRecords[positionId].settledAt != 0) continue;
			if (!cdsVault.isActive(positionId)) continue;

			ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);
			if (!creditOracle.isCreditEventDeclared(pos.referenceEntity)) continue;

			uint256 recoveryBps = entityRecoveryBps[pos.referenceEntity] != 0
				? entityRecoveryBps[pos.referenceEntity]
				: DEFAULT_RECOVERY_BPS;
			uint256 payout = SpreadMath.computePayout(pos.notional, recoveryBps);
			uint256 surplus = pos.collateral > payout ? pos.collateral - payout : 0;

			settlementRecords[positionId] = SettlementRecord({
				positionId: positionId,
				buyer: pos.buyer,
				seller: pos.seller,
				notional: pos.notional,
				payout: payout,
				surplus: surplus,
				recoveryBps: recoveryBps,
				settledAt: block.timestamp
			});

			totalPayoutsExecuted++;
			totalPayoutAmount += payout;
			cdsVault.executePayout(positionId, recoveryBps);

			emit CreditEventSettled(
				positionId,
				pos.buyer,
				pos.seller,
				pos.notional,
				payout,
				surplus,
				recoveryBps
			);
		}
	}

	function setEntityRecoveryRate(address entity, uint256 recoveryBps) external onlyOwner {
		_setEntityRecoveryRate(entity, recoveryBps);
	}

	function _setEntityRecoveryRate(address entity, uint256 recoveryBps) internal {
		if (entity == address(0)) revert ZeroAddress();
		if (recoveryBps > 10_000) revert InvalidRecoveryRate(recoveryBps);

		entityRecoveryBps[entity] = recoveryBps;
		emit RecoveryRateSet(entity, recoveryBps);
	}

	function previewPayout(uint256 positionId)
		external
		view
		returns (uint256 payout, uint256 surplus, uint256 recoveryBps)
	{
		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);

		recoveryBps = entityRecoveryBps[pos.referenceEntity] != 0
			? entityRecoveryBps[pos.referenceEntity]
			: DEFAULT_RECOVERY_BPS;
		payout = SpreadMath.computePayout(pos.notional, recoveryBps);
		surplus = pos.collateral > payout ? pos.collateral - payout : 0;
	}

	function getSettlementRecord(uint256 positionId) external view returns (SettlementRecord memory) {
		return settlementRecords[positionId];
	}

	function isSettled(uint256 positionId) external view returns (bool) {
		return settlementRecords[positionId].settledAt != 0;
	}

	// Backward compatibility for existing ISettlementEngine-style calls.
	function settlePosition(uint256 positionId) external {
		settleCDS(positionId);
	}

	function markCreditEvent(address referenceEntity, uint256 recoveryBps) external onlyOwner {
		_setEntityRecoveryRate(referenceEntity, recoveryBps);
	}

	function hasCreditEvent(address referenceEntity) external view returns (bool) {
		return creditOracle.isCreditEventDeclared(referenceEntity);
	}

	function getRecoveryBps(address referenceEntity) external view returns (uint256) {
		uint256 configured = entityRecoveryBps[referenceEntity];
		return configured == 0 ? DEFAULT_RECOVERY_BPS : configured;
	}
}

