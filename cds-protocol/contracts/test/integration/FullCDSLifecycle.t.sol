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

contract FullCDSLifecycleTest is Test {
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

	address internal treasury = address(0x6000);
	address internal seller = address(0x6001);
	address internal buyerA = address(0x6002);
	address internal buyerB = address(0x6003);
	address internal refA = address(0x6004);
	address internal refB = address(0x6005);

	function setUp() external {
		usdc = new MockERC20("Mock USDC", "USDC", 6);
		weth = new MockERC20("Mock WETH", "WETH", 18);
		cdsToken = new CDSToken("", address(this));
		creditOracle = new CreditOracle(address(this));
		cdsVault = new CDSVault(address(usdc), address(cdsToken), address(this));
		premiumEngine = new PremiumEngine(address(usdc), address(cdsVault), treasury, address(this));
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

		usdc.mint(seller, 1_000_000e6);
		usdc.mint(buyerA, 200_000e6);
		usdc.mint(buyerB, 200_000e6);

		vm.prank(seller);
		usdc.approve(address(cdsVault), type(uint256).max);
		vm.prank(buyerA);
		usdc.approve(address(premiumEngine), type(uint256).max);
		vm.prank(buyerB);
		usdc.approve(address(premiumEngine), type(uint256).max);
	}

	function testFullProtocolLifecycleWithBatchSettlement() external {
		uint256 posA = cdsVault.openCDS(buyerA, seller, refA, 100_000e6, 100, 365);
		uint256 posB = cdsVault.openCDS(buyerB, seller, refB, 80_000e6, 120, 365);

		vm.warp(block.timestamp + 90 days);
		uint256 treasuryBefore = usdc.balanceOf(treasury);

		vm.prank(buyerA);
		premiumEngine.collectPremium(posA);
		vm.prank(buyerB);
		premiumEngine.collectPremium(posB);

		assertEq(usdc.balanceOf(treasury), treasuryBefore + 250e6 + 240e6);

		creditOracle.markDefaulted(refA, true);
		creditOracle.markDefaulted(refB, true);

		uint256 buyerABefore = usdc.balanceOf(buyerA);
		uint256 buyerBBefore = usdc.balanceOf(buyerB);

		uint256[] memory ids = new uint256[](2);
		ids[0] = posA;
		ids[1] = posB;
		settlementEngine.batchSettleCDS(ids);

		assertEq(usdc.balanceOf(buyerA), buyerABefore + 60_000e6);
		assertEq(usdc.balanceOf(buyerB), buyerBBefore + 48_000e6);
		assertEq(settlementEngine.totalPayoutsExecuted(), 2);
	}
}
