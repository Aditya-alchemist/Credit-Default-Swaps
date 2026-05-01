// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {MockERC20} from "../../mocks/MockERC20.sol";
import {CDSToken} from "../../src/tokens/CDSToken.sol";
import {LendingToken} from "../../src/tokens/LendingToken.sol";
import {CreditOracle} from "../../src/oracle/CreditOracle.sol";
import {CDSVault} from "../../src/core/CDSVault.sol";
import {PremiumEngine} from "../../src/core/PremiumEngine.sol";
import {MarginEngine} from "../../src/core/MarginEngine.sol";
import {SettlementEngine} from "../../src/core/SettlementEngine.sol";
import {LendingPool} from "../../src/core/LendingPool.sol";

contract LendingCDSIntegrationTest is Test {
	MockERC20 internal usdc;
	MockERC20 internal weth;
	CDSToken internal cdsToken;
	LendingToken internal lendingToken;
	CreditOracle internal creditOracle;
	CDSVault internal cdsVault;
	PremiumEngine internal premiumEngine;
	MarginEngine internal marginEngine;
	SettlementEngine internal settlementEngine;
	LendingPool internal lendingPool;

	address internal owner = address(this);
	address internal liquidityProvider = address(0x1001);
	address internal protectionBuyer = address(0x1002);
	address internal protectionSeller = address(0x1003);
	address internal borrower = address(0x1004);
	address internal liquidator = address(0x1005);

	function setUp() external {
		usdc = new MockERC20("Mock USDC", "USDC", 6);
		weth = new MockERC20("Mock WETH", "WETH", 18);
		cdsToken = new CDSToken("", owner);
		creditOracle = new CreditOracle(owner);
		cdsVault = new CDSVault(address(usdc), address(cdsToken), owner);
		premiumEngine = new PremiumEngine(address(usdc), address(cdsVault), address(cdsVault), owner);
		marginEngine = new MarginEngine(address(cdsVault), address(creditOracle), owner);
		settlementEngine = new SettlementEngine(address(cdsVault), address(creditOracle), owner);
		lendingToken = new LendingToken("Lending USDC", "lUSDC", owner);

		lendingPool = new LendingPool(
			address(usdc),
			address(weth),
			address(lendingToken),
			address(cdsVault),
			address(premiumEngine),
			address(marginEngine),
			address(creditOracle),
			owner
		);

		cdsToken.setMinter(address(cdsVault), true);
		cdsVault.setEngines(address(settlementEngine), address(marginEngine), address(premiumEngine));
		lendingToken.setPool(address(lendingPool));
		creditOracle.setAuthorizedReporter(address(lendingPool), true);

		usdc.mint(liquidityProvider, 1_000_000e6);
		usdc.mint(protectionSeller, 1_000_000e6);
		usdc.mint(liquidator, 1_000_000e6);
		weth.mint(borrower, 1_000e18);

		vm.prank(liquidityProvider);
		usdc.approve(address(lendingPool), type(uint256).max);

		vm.prank(protectionSeller);
		usdc.approve(address(cdsVault), type(uint256).max);

		vm.prank(liquidator);
		usdc.approve(address(lendingPool), type(uint256).max);

		vm.prank(borrower);
		weth.approve(address(lendingPool), type(uint256).max);
	}

	function testLiquidationReportsDefaultAndSettlementPaysBuyer() external {
		vm.prank(liquidityProvider);
		lendingPool.deposit(200_000e6);

		vm.prank(owner);
		uint256 cdsPositionId = cdsVault.openCDS(
			protectionBuyer,
			protectionSeller,
			borrower,
			50_000e6,
			100,
			365
		);

		vm.prank(borrower);
		uint256 loanId = lendingPool.borrow(50e18, 70_000e6, 0);

		vm.prank(owner);
		lendingPool.setWethPrice(700e6);

		vm.prank(liquidator);
		lendingPool.liquidate(loanId);

		CreditOracle.DefaultRecord memory rec = creditOracle.getBorrowerDefault(borrower);
		assertTrue(rec.exists);
		assertEq(rec.loanId, loanId);
		assertEq(rec.loanAmount, 70_000e6);
		assertTrue(creditOracle.isCreditEventDeclared(borrower));

		uint256 buyerBefore = usdc.balanceOf(protectionBuyer);
		uint256 sellerBefore = usdc.balanceOf(protectionSeller);

		settlementEngine.settleCDS(cdsPositionId);

		assertEq(usdc.balanceOf(protectionBuyer), buyerBefore + 30_000e6);
		assertEq(usdc.balanceOf(protectionSeller), sellerBefore + 30_000e6);

		CDSVault.CDSPosition memory cdsPos = cdsVault.getPosition(cdsPositionId);
		assertEq(uint256(cdsPos.state), uint256(CDSVault.PositionState.DEFAULTED));
		assertFalse(cdsVault.isActive(cdsPositionId));
	}

	function testEnableCDSProtectionUsesExplicitSellerCollateral() external {
		vm.prank(liquidityProvider);
		uint256 supplyId = lendingPool.deposit(100_000e6);

		uint256 sellerBefore = usdc.balanceOf(protectionSeller);

		vm.prank(liquidityProvider);
		lendingPool.enableCDSProtection(supplyId, protectionSeller);

		LendingPool.SupplyPosition memory supplyPos = lendingPool.getSupplyPosition(supplyId);
		bool enabled = supplyPos.cdsProtectionEnabled;
		uint256 cdsPositionId = supplyPos.cdsPositionId;
		assertTrue(enabled);
		assertEq(cdsPositionId, 1);

		assertEq(usdc.balanceOf(protectionSeller), sellerBefore - 120_000e6);
	}
}
