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

contract PremiumEngineTest is Test {
	MockERC20 internal usdc;
	CDSToken internal cdsToken;
	CreditOracle internal creditOracle;
	CDSVault internal cdsVault;
	PremiumEngine internal premiumEngine;
	MarginEngine internal marginEngine;
	SettlementEngine internal settlementEngine;

	address internal buyer = address(0x3001);
	address internal seller = address(0x3002);
	address internal treasury = address(0x3003);
	address internal referenceEntity = address(0x3004);

	function setUp() external {
		usdc = new MockERC20("Mock USDC", "USDC", 6);
		cdsToken = new CDSToken("", address(this));
		creditOracle = new CreditOracle(address(this));
		cdsVault = new CDSVault(address(usdc), address(cdsToken), address(this));
		premiumEngine = new PremiumEngine(address(usdc), address(cdsVault), treasury, address(this));
		marginEngine = new MarginEngine(address(cdsVault), address(creditOracle), address(this));
		settlementEngine = new SettlementEngine(address(cdsVault), address(creditOracle), address(this));

		cdsToken.setMinter(address(cdsVault), true);
		cdsVault.setEngines(address(settlementEngine), address(marginEngine), address(premiumEngine));

		usdc.mint(seller, 500_000e6);
		usdc.mint(buyer, 100_000e6);

		vm.prank(seller);
		usdc.approve(address(cdsVault), type(uint256).max);
		vm.prank(buyer);
		usdc.approve(address(premiumEngine), type(uint256).max);
	}

	function testOpenCDSInitializesPremiumSchedule() external {
		uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, 100_000e6, 100, 365);
		assertEq(premiumEngine.getNextPremiumDue(posId), block.timestamp + 90 days);
	}

	function testCollectPremiumAfterDueTransfersFunds() external {
		uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, 100_000e6, 100, 365);

		vm.warp(block.timestamp + 90 days);

		uint256 treasuryBefore = usdc.balanceOf(treasury);
		vm.prank(buyer);
		premiumEngine.collectPremium(posId);

		assertEq(usdc.balanceOf(treasury), treasuryBefore + 250e6);
		assertEq(premiumEngine.getTotalPremiumsCollected(posId), 250e6);
		assertEq(premiumEngine.getNextPremiumDue(posId), block.timestamp + 90 days);
	}
}
