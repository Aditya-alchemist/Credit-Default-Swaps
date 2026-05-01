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

contract CDSVaultTest is Test {
	MockERC20 internal usdc;
	CDSToken internal cdsToken;
	CreditOracle internal creditOracle;
	CDSVault internal cdsVault;
	PremiumEngine internal premiumEngine;
	MarginEngine internal marginEngine;
	SettlementEngine internal settlementEngine;

	address internal buyer = address(0x1001);
	address internal seller = address(0x1002);
	address internal referenceEntity = address(0x1003);

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

		usdc.mint(seller, 500_000e6);
		vm.prank(seller);
		usdc.approve(address(cdsVault), type(uint256).max);
	}

	function testOpenCDSLocksSellerCollateralAndMintsTokens() external {
		uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, 100_000e6, 150, 365);

		assertEq(posId, 1);
		assertEq(cdsVault.sellerCollateral(seller), 120_000e6);
		assertEq(usdc.balanceOf(address(cdsVault)), 120_000e6);
		assertEq(usdc.balanceOf(seller), 380_000e6);

		assertEq(cdsToken.balanceOf(buyer, 2), 1);
		assertEq(cdsToken.balanceOf(seller, 3), 1);
	}

	function testExecutePayoutOnlyAuthorizedEngine() external {
		uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, 100_000e6, 100, 365);

		vm.expectRevert(CDSVault.OnlyAuthorizedEngine.selector);
		cdsVault.executePayout(posId, 4_000);

		uint256 buyerBefore = usdc.balanceOf(buyer);
		uint256 sellerBefore = usdc.balanceOf(seller);

		vm.prank(address(settlementEngine));
		cdsVault.executePayout(posId, 4_000);

		assertEq(usdc.balanceOf(buyer), buyerBefore + 60_000e6);
		assertEq(usdc.balanceOf(seller), sellerBefore + 60_000e6);
		assertEq(uint256(cdsVault.getPosition(posId).state), uint256(CDSVault.PositionState.DEFAULTED));
	}
}
