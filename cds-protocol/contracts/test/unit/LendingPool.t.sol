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

contract LendingPoolTest is Test {
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

	address internal lender = address(0x2001);
	address internal borrower = address(0x2002);
	address internal liquidator = address(0x2003);

	function setUp() external {
		usdc = new MockERC20("Mock USDC", "USDC", 6);
		weth = new MockERC20("Mock WETH", "WETH", 18);
		cdsToken = new CDSToken("", address(this));
		creditOracle = new CreditOracle(address(this));
		cdsVault = new CDSVault(address(usdc), address(cdsToken), address(this));
		premiumEngine = new PremiumEngine(address(usdc), address(cdsVault), address(this), address(this));
		marginEngine = new MarginEngine(address(cdsVault), address(creditOracle), address(this));
		settlementEngine = new SettlementEngine(address(cdsVault), address(creditOracle), address(this));
		lendingToken = new LendingToken("Lending USDC", "lUSDC", address(this));

		lendingPool = new LendingPool(
			address(usdc),
			address(weth),
			address(lendingToken),
			address(cdsVault),
			address(premiumEngine),
			address(marginEngine),
			address(creditOracle),
			address(this)
		);

		cdsToken.setMinter(address(cdsVault), true);
		cdsVault.setEngines(address(settlementEngine), address(marginEngine), address(premiumEngine));
		lendingToken.setPool(address(lendingPool));
		creditOracle.setAuthorizedReporter(address(lendingPool), true);

		usdc.mint(lender, 1_000_000e6);
		usdc.mint(liquidator, 1_000_000e6);
		usdc.mint(borrower, 50_000e6);
		weth.mint(borrower, 100e18);

		vm.prank(lender);
		usdc.approve(address(lendingPool), type(uint256).max);
		vm.prank(liquidator);
		usdc.approve(address(lendingPool), type(uint256).max);
		vm.prank(borrower);
		usdc.approve(address(lendingPool), type(uint256).max);
		vm.prank(borrower);
		weth.approve(address(lendingPool), type(uint256).max);
	}

	function testBorrowAndRepayUpdatesState() external {
		vm.prank(lender);
		lendingPool.deposit(200_000e6);

		vm.prank(borrower);
		uint256 loanId = lendingPool.borrow(10e18, 12_000e6, 0);

		vm.warp(block.timestamp + 30 days);

		vm.prank(borrower);
		lendingPool.repay(loanId);

		LendingPool.LoanPosition memory loan = lendingPool.getLoanPosition(loanId);
		assertEq(uint256(loan.state), uint256(LendingPool.LoanState.REPAID));
		assertEq(lendingPool.totalBorrowed(), 0);
	}

	function testLiquidationReportsLendingDefaultToOracle() external {
		vm.prank(lender);
		lendingPool.deposit(200_000e6);

		vm.prank(borrower);
		uint256 loanId = lendingPool.borrow(10e18, 15_000e6, 0);

		lendingPool.setWethPrice(900e6);

		vm.prank(liquidator);
		lendingPool.liquidate(loanId);

		CreditOracle.DefaultRecord memory rec = creditOracle.getBorrowerDefault(borrower);
		assertTrue(rec.exists);
		assertEq(rec.loanId, loanId);
		assertEq(rec.loanAmount, 15_000e6);
		assertTrue(creditOracle.isCreditEventDeclared(borrower));
	}
}
