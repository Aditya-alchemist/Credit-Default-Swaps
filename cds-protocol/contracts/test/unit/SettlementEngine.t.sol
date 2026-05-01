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

contract SettlementEngineTest is Test {
	MockERC20 internal usdc;
	CDSToken internal cdsToken;
	CreditOracle internal creditOracle;
	CDSVault internal cdsVault;
	PremiumEngine internal premiumEngine;
	MarginEngine internal marginEngine;
	SettlementEngine internal settlementEngine;

	address internal buyer = address(0x5001);
	address internal seller = address(0x5002);
	address internal referenceEntity = address(0x5003);

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

	function testSettleRevertsWithoutCreditEvent() external {
		uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, 100_000e6, 100, 365);
		vm.expectRevert();
		settlementEngine.settleCDS(posId);
	}

	function testSettleCDSRecordsAndPaysOut() external {
		uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, 100_000e6, 100, 365);
		creditOracle.markDefaulted(referenceEntity, true);

		uint256 buyerBefore = usdc.balanceOf(buyer);
		settlementEngine.settleCDS(posId);

		SettlementEngine.SettlementRecord memory rec = settlementEngine.getSettlementRecord(posId);
		assertEq(rec.positionId, posId);
		assertEq(rec.payout, 60_000e6);
		assertEq(rec.surplus, 60_000e6);
		assertEq(usdc.balanceOf(buyer), buyerBefore + 60_000e6);
	}
}
