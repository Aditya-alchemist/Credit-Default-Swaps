// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICDSVault} from "../interfaces/ICDSVault.sol";
import {SpreadMath} from "../libraries/SpreadMath.sol";

contract PremiumEngine is ReentrancyGuard, Ownable {
	using SafeERC20 for IERC20;

	// grace period for missed premium
	uint256 public constant GRACE_PERIOD = 24 hours;

	// premium interval (quarterly)
	uint256 public constant PAYMENT_INTERVAL = 90 days;

	// forge-lint: disable-next-line(screaming-snake-case-immutable)
	IERC20 public immutable usdc;
	// forge-lint: disable-next-line(screaming-snake-case-immutable)
	ICDSVault public immutable cdsVault;
	address public premiumReceiver;

	mapping(uint256 => uint256) public nextPremiumDue;
	mapping(uint256 => uint256) public totalPremiumsCollected;

	event PremiumCollected(
		uint256 indexed positionId,
		address indexed buyer,
		uint256 amount,
		uint256 nextDue
	);
	event PremiumMissed(uint256 indexed positionId, address indexed buyer, uint256 dueTimestamp);
	event PositionInitialized(uint256 indexed positionId, uint256 firstPremiumDue);

error NotDueYet(uint256 positionId, uint256 dueAt, uint256 currentTime);
	error PositionNotActive(uint256 positionId);
	error ZeroAddress();
	error OnlyCDSVault();

	constructor(address _usdc, address _cdsVault, address _premiumReceiver, address _owner)
		Ownable(_owner)
	{
		if (_usdc == address(0)) revert ZeroAddress();
		if (_cdsVault == address(0)) revert ZeroAddress();
		if (_premiumReceiver == address(0)) revert ZeroAddress();

		usdc = IERC20(_usdc);
		cdsVault = ICDSVault(_cdsVault);
		premiumReceiver = _premiumReceiver;
	}

	function initializePosition(uint256 positionId) external {
		nextPremiumDue[positionId] = block.timestamp;
		emit PositionInitialized(positionId, block.timestamp);
	}

	function collectPremium(uint256 positionId) public nonReentrant {
		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);

		if (!cdsVault.isActive(positionId)) revert PositionNotActive(positionId);
		if (msg.sender != pos.buyer) revert PositionNotActive(positionId);

		uint256 due = nextPremiumDue[positionId];
		if (block.timestamp < due) revert NotDueYet(positionId, due, block.timestamp);

		uint256 premium = SpreadMath.computePremium(pos.notional, pos.spreadBps, 90);

		nextPremiumDue[positionId] = due + PAYMENT_INTERVAL;
		totalPremiumsCollected[positionId] += premium;

		cdsVault.updateLastPremiumPaid(positionId, block.timestamp);
		usdc.safeTransferFrom(msg.sender, premiumReceiver, premium);

		emit PremiumCollected(positionId, msg.sender, premium, nextPremiumDue[positionId]);
	}

	function isPremiumMissed(uint256 positionId) external view returns (bool) {
		uint256 due = nextPremiumDue[positionId];
		if (due == 0) return false;
		return block.timestamp > due + GRACE_PERIOD;
	}

	function getNextPremiumAmount(uint256 positionId) external view returns (uint256) {
		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);
		return SpreadMath.computePremium(pos.notional, pos.spreadBps, 90);
	}

	function getNextPremiumDue(uint256 positionId) external view returns (uint256) {
		return nextPremiumDue[positionId];
	}

	function getTotalPremiumsCollected(uint256 positionId) external view returns (uint256) {
		return totalPremiumsCollected[positionId];
	}

	function setPremiumReceiver(address newReceiver) external onlyOwner {
		if (newReceiver == address(0)) revert ZeroAddress();
		premiumReceiver = newReceiver;
	}

	// Backward compatibility for existing IPremiumEngine wiring.
	function accrueAndCollect(uint256 positionId) external returns (uint256 premiumDue) {
		collectPremium(positionId);
		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);
		premiumDue = SpreadMath.computePremium(pos.notional, pos.spreadBps, 90);
	}

	function getPremiumDue(uint256 positionId) external view returns (uint256 premiumDue) {
		ICDSVault.CDSPosition memory pos = cdsVault.getPosition(positionId);
		premiumDue = SpreadMath.computePremium(pos.notional, pos.spreadBps, 90);
	}
}

