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

contract FuzzProtocolInvariantsTest is Test {
    MockERC20 internal usdc;
    CDSToken internal cdsToken;
    CreditOracle internal creditOracle;
    CDSVault internal cdsVault;
    PremiumEngine internal premiumEngine;
    MarginEngine internal marginEngine;
    SettlementEngine internal settlementEngine;

    address internal buyer = address(0x7101);
    address internal seller = address(0x7102);
    address internal referenceEntity = address(0x7103);

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

        usdc.mint(seller, 20_000_000e6);
        vm.prank(seller);
        usdc.approve(address(cdsVault), type(uint256).max);
    }

    function testFuzz_NoOverPayout(uint96 notionalRaw, uint16 recoveryRaw) external {
        uint256 notional = bound(uint256(notionalRaw), 1e6, 5_000_000e6);
        uint256 recoveryBps = uint256(recoveryRaw) % 10_001;

        uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, notional, 100, 365);
        creditOracle.markDefaulted(referenceEntity, true);
        settlementEngine.setEntityRecoveryRate(referenceEntity, recoveryBps);

        uint256 buyerBefore = usdc.balanceOf(buyer);

        settlementEngine.settleCDS(posId);

        uint256 buyerDelta = usdc.balanceOf(buyer) - buyerBefore;
        uint256 effectiveRecoveryBps = recoveryBps == 0 ? 4_000 : recoveryBps;
        uint256 expectedPayout = (notional * (10_000 - effectiveRecoveryBps)) / 10_000;

        assertEq(buyerDelta, expectedPayout);
        assertLe(buyerDelta, notional);
    }

    function testFuzz_CollateralConservationOnSettlement(uint96 notionalRaw, uint16 recoveryRaw)
        external
    {
        uint256 notional = bound(uint256(notionalRaw), 1e6, 5_000_000e6);
        uint256 recoveryBps = uint256(recoveryRaw) % 10_001;
        uint256 collateral = (notional * cdsVault.MIN_COLLATERAL_BPS()) / 10_000;

        uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, notional, 100, 365);
        creditOracle.markDefaulted(referenceEntity, true);
        settlementEngine.setEntityRecoveryRate(referenceEntity, recoveryBps);

        uint256 buyerBefore = usdc.balanceOf(buyer);
        uint256 sellerBefore = usdc.balanceOf(seller);

        settlementEngine.settleCDS(posId);

        uint256 buyerDelta = usdc.balanceOf(buyer) - buyerBefore;
        uint256 sellerDelta = usdc.balanceOf(seller) - sellerBefore;

        assertEq(buyerDelta + sellerDelta, collateral);
        assertEq(cdsVault.sellerCollateral(seller), 0);
    }

    function testFuzz_BatchSettlementIdempotent(uint96 notionalRaw, uint16 recoveryRaw) external {
        uint256 notional = bound(uint256(notionalRaw), 1e6, 5_000_000e6);
        uint256 recoveryBps = uint256(recoveryRaw) % 10_001;

        uint256 posId = cdsVault.openCDS(buyer, seller, referenceEntity, notional, 100, 365);
        creditOracle.markDefaulted(referenceEntity, true);
        settlementEngine.setEntityRecoveryRate(referenceEntity, recoveryBps);

        uint256[] memory ids = new uint256[](1);
        ids[0] = posId;

        settlementEngine.batchSettleCDS(ids);

        uint256 payoutsExecutedAfterFirst = settlementEngine.totalPayoutsExecuted();
        uint256 payoutAmountAfterFirst = settlementEngine.totalPayoutAmount();
        uint256 buyerBalanceAfterFirst = usdc.balanceOf(buyer);
        uint256 sellerBalanceAfterFirst = usdc.balanceOf(seller);

        settlementEngine.batchSettleCDS(ids);

        assertEq(settlementEngine.totalPayoutsExecuted(), payoutsExecutedAfterFirst);
        assertEq(settlementEngine.totalPayoutAmount(), payoutAmountAfterFirst);
        assertEq(usdc.balanceOf(buyer), buyerBalanceAfterFirst);
        assertEq(usdc.balanceOf(seller), sellerBalanceAfterFirst);
    }
}