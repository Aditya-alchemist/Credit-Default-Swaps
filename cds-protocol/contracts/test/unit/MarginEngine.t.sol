// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {MockERC20} from "../../mocks/MockERC20.sol";
import {CDSToken} from "../../src/tokens/CDSToken.sol";
import {CreditOracle} from "../../src/oracle/CreditOracle.sol";
import {CDSVault} from "../../src/core/CDSVault.sol";
import {PremiumEngine} from "../../src/core/PremiumEngine.sol";
import {MarginEngine} from "../../src/core/MarginEngine.sol";
import {SettlementEngine} from "../../src/core/SettlementEngine.sol";

contract MarginEngineTest is Test {
	MockERC20 internal usdc;
	CDSToken internal cdsToken;
	CreditOracle internal creditOracle;
	CDSVault internal cdsVault;
	PremiumEngine internal premiumEngine;
	MarginEngine internal marginEngine;
	SettlementEngine internal settlementEngine;

	address internal buyer = address(0x4001);
	address internal seller = address(0x4002);
	address internal referenceEntity = address(0x4003);

	function setUp() external {
		usdc = new MockERC20("Mock USDC", "USDC", 6);
		cdsToken = new CDSToken("", address(this));
		creditOracle = new CreditOracle(address(this));
		cdsVault = new CDSVault(address(usdc), address(cdsToken), address(this));
		premiumEngine = new PremiumEngine(address(usdc), address(cdsVault), address(this), address(this));
		marginEngine = new MarginEngine(address(cdsVault), address(creditOracle), address(this));
		settlementEngine = new SettlementEngine(address(cdsVault), address(creditOracle), address(this));

		cdsToken.setMinter(address(cdsVault), true);
		cdsVault.setEngines(address(settlementEngine), address(marginEngine), address(premiumEngine));

		usdc.mint(seller, 1_000_000e6);
		vm.prank(seller);
		usdc.approve(address(cdsVault), type(uint256).max);
	}

	function testCheckMarginTriggersMarginCallAtHighSpread() external {
		uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, 100_000e6, 100, 365);
		creditOracle.setCreditData(referenceEntity, 500, 10_000, 4_000);

		marginEngine.checkMargin(posId);

		assertEq(uint256(cdsVault.getPosition(posId).state), uint256(CDSVault.PositionState.MARGIN_CALL));
		assertTrue(marginEngine.marginCallTimestamp(posId) > 0);
	}

	function testLiquidatePositionAfterWindow() external {
		uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, 100_000e6, 100, 365);
		creditOracle.setCreditData(referenceEntity, 500, 10_000, 4_000);
		marginEngine.checkMargin(posId);

		vm.warp(block.timestamp + 4 hours + 1);
		marginEngine.liquidatePosition(posId);

		assertEq(uint256(cdsVault.getPosition(posId).state), uint256(CDSVault.PositionState.DEFAULTED));
		assertFalse(cdsVault.isActive(posId));
	}
}
