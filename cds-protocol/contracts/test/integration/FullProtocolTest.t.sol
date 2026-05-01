// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {CDSVault} from "../../src/core/CDSVault.sol";
import {LendingPool} from "../../src/core/LendingPool.sol";
import {PremiumEngine} from "../../src/core/PremiumEngine.sol";
import {MarginEngine} from "../../src/core/MarginEngine.sol";
import {SettlementEngine} from "../../src/core/SettlementEngine.sol";
import {CreditOracle} from "../../src/oracle/CreditOracle.sol";
import {CDSToken} from "../../src/tokens/CDSToken.sol";
import {LendingToken} from "../../src/tokens/LendingToken.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";

contract FullProtocolTest is Test {
    CDSVault public cdsVault;
    LendingPool public lendingPool;
    PremiumEngine public premiumEngine;
    MarginEngine public marginEngine;
    SettlementEngine public settlementEngine;
    CreditOracle public creditOracle;
    CDSToken public cdsToken;
    LendingToken public lendingToken;
    MockERC20 public usdc;
    MockERC20 public weth;

    address public owner = makeAddr("owner");
    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public lender = makeAddr("lender");
    address public borrower = makeAddr("borrower");
    address public liquidator = makeAddr("liquidator");
    address public keeper = makeAddr("keeper");
    address public entity = makeAddr("entity");

    uint256 constant NOTIONAL = 100e6;
    uint256 constant SPREAD_BPS = 200;
    uint256 constant MATURITY_DAYS = 365;
    uint256 constant RECOVERY_BPS = 4000;
    uint256 constant WETH_PRICE = 2000e6;
    uint256 constant COLLATERAL_120 = 120e6;
    uint256 constant LOAN_AMOUNT = 1500e6;
    uint256 constant WETH_LOCKED = 1e18;

    function setUp() public {
        vm.startPrank(owner);

        usdc = new MockERC20("Mock USDC", "USDC", 6);
        weth = new MockERC20("Mock WETH", "WETH", 18);

        cdsToken = new CDSToken("", owner);
        lendingToken = new LendingToken("Lending USDC", "lUSDC", owner);
        creditOracle = new CreditOracle(owner);
        cdsVault = new CDSVault(address(usdc), address(cdsToken), owner);
        premiumEngine = new PremiumEngine(address(usdc), address(cdsVault), owner, owner);
        marginEngine = new MarginEngine(address(cdsVault), address(creditOracle), owner);
        settlementEngine = new SettlementEngine(address(cdsVault), address(creditOracle), owner);
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

        cdsVault.setEngines(address(settlementEngine), address(marginEngine), address(premiumEngine));
        cdsToken.setMinter(address(cdsVault), true);
        lendingToken.setPool(address(lendingPool));

        creditOracle.setUpdater(keeper, true);
        creditOracle.setAuthorizedReporter(address(lendingPool), true);
        creditOracle.setCreditData(entity, 800, 200, RECOVERY_BPS);

        lendingPool.setWethPrice(WETH_PRICE);

        vm.stopPrank();

        usdc.mint(seller, 5_000e6);
        usdc.mint(buyer, 500e6);
        usdc.mint(lender, 5_000e6);
        usdc.mint(liquidator, 5_000e6);
        weth.mint(borrower, 10e18);

        vm.prank(seller);
        usdc.approve(address(cdsVault), type(uint256).max);
    }

    function test_A1_deploymentCorrect() public view {
        assertEq(address(cdsVault.usdc()), address(usdc));
        assertEq(address(cdsVault.cdsToken()), address(cdsToken));
        assertEq(cdsVault.nextPositionId(), 1);
    }

    function test_A2_enginesSetCorrectly() public view {
        assertEq(cdsVault.settlementEngine(), address(settlementEngine));
        assertEq(cdsVault.marginEngine(), address(marginEngine));
        assertEq(cdsVault.premiumEngine(), address(premiumEngine));
    }

    function test_A3_enginesNotSet_reverts() public {
        vm.prank(owner);
        CDSVault freshVault = new CDSVault(address(usdc), address(cdsToken), owner);

        address seller2 = makeAddr("seller2");
        usdc.mint(seller2, COLLATERAL_120);
        vm.prank(seller2);
        usdc.approve(address(freshVault), COLLATERAL_120);

        vm.prank(seller2);
        vm.expectRevert(CDSVault.EnginesNotSet.selector);
        freshVault.openCDS(buyer, seller2, entity, NOTIONAL, SPREAD_BPS, MATURITY_DAYS);
    }

    function test_B1_openCDS_success() public {
        uint256 posId = _openCDS();
        CDSVault.CDSPosition memory pos = _getPosition(posId);

        assertEq(pos.buyer, buyer);
        assertEq(pos.seller, seller);
        assertEq(pos.referenceEntity, entity);
        assertEq(pos.notional, NOTIONAL);
        assertEq(pos.collateral, COLLATERAL_120);
        assertEq(uint8(pos.state), uint8(CDSVault.PositionState.ACTIVE));
    }

    function test_B2_openCDS_emitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit CDSVault.PositionOpened(
            1,
            buyer,
            seller,
            entity,
            NOTIONAL,
            SPREAD_BPS,
            COLLATERAL_120,
            block.timestamp + MATURITY_DAYS * 1 days
        );

        vm.prank(seller);
        cdsVault.openCDS(buyer, seller, entity, NOTIONAL, SPREAD_BPS, MATURITY_DAYS);
    }

    function test_B3_openCDS_mintsPositionTokens() public {
        uint256 posId = _openCDS();
        uint256 buyerId = cdsToken.buyerTokenId(posId);
        uint256 sellerId = cdsToken.sellerTokenId(posId);

        assertEq(cdsToken.balanceOf(buyer, buyerId), 1);
        assertEq(cdsToken.balanceOf(seller, sellerId), 1);
    }

    function test_B4_openCDS_insufficientCollateral_reverts() public {
        address poorSeller = makeAddr("poorSeller");
        usdc.mint(poorSeller, 50e6);

        vm.prank(poorSeller);
        usdc.approve(address(cdsVault), 50e6);

        vm.prank(poorSeller);
        vm.expectRevert(
            abi.encodeWithSelector(CDSVault.InsufficientCollateral.selector, COLLATERAL_120, 50e6)
        );
        cdsVault.openCDS(buyer, poorSeller, entity, NOTIONAL, SPREAD_BPS, MATURITY_DAYS);
    }

    function test_B5_openCDS_zeroNotional_reverts() public {
        vm.prank(seller);
        vm.expectRevert(CDSVault.ZeroAmount.selector);
        cdsVault.openCDS(buyer, seller, entity, 0, SPREAD_BPS, MATURITY_DAYS);
    }

    function test_B6_openCDS_zeroBuyer_reverts() public {
        vm.prank(seller);
        vm.expectRevert(CDSVault.ZeroAddress.selector);
        cdsVault.openCDS(address(0), seller, entity, NOTIONAL, SPREAD_BPS, MATURITY_DAYS);
    }

    function test_B7_topUpCollateral_success() public {
        uint256 posId = _openCDS();

        vm.prank(seller);
        cdsVault.topUpCollateral(posId, 20e6);

        CDSVault.CDSPosition memory pos = _getPosition(posId);
        assertEq(pos.collateral, COLLATERAL_120 + 20e6);
    }

    function test_B8_topUpCollateral_notSeller_reverts() public {
        uint256 posId = _openCDS();

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(CDSVault.NotSeller.selector, posId));
        cdsVault.topUpCollateral(posId, 10e6);
    }

    function test_B9_expirePosition_success() public {
        uint256 posId = _openCDS();
        vm.warp(block.timestamp + MATURITY_DAYS * 1 days + 1);

        uint256 sellerBalanceBefore = usdc.balanceOf(seller);
        cdsVault.expirePosition(posId);

        CDSVault.CDSPosition memory pos = _getPosition(posId);
        assertEq(uint8(pos.state), uint8(CDSVault.PositionState.EXPIRED));
        assertEq(pos.collateral, 0);
        assertEq(usdc.balanceOf(seller), sellerBalanceBefore + COLLATERAL_120);
    }

    function test_B10_expirePosition_beforeMaturity_reverts() public {
        uint256 posId = _openCDS();

        vm.expectRevert(
            abi.encodeWithSelector(
                CDSVault.MaturityNotReached.selector,
                block.timestamp + MATURITY_DAYS * 1 days,
                block.timestamp
            )
        );
        cdsVault.expirePosition(posId);
    }

    function test_C1_collectPremium_success() public {
        uint256 posId = _openCDS();

        vm.prank(buyer);
        usdc.approve(address(premiumEngine), type(uint256).max);
        vm.warp(block.timestamp + 90 days);

        uint256 buyerBalBefore = usdc.balanceOf(buyer);

        vm.prank(buyer);
        premiumEngine.collectPremium(posId);

        assertTrue(usdc.balanceOf(buyer) < buyerBalBefore);
    }

    function test_C2_collectPremium_notBuyer_reverts() public {
        uint256 posId = _openCDS();

        vm.warp(block.timestamp + 90 days);
        vm.prank(seller);
        vm.expectRevert();
        premiumEngine.collectPremium(posId);
    }

    function test_C3_isPremiumMissed_beforeGrace_false() public {
        uint256 posId = _openCDS();
        assertFalse(premiumEngine.isPremiumMissed(posId));
    }

    function test_C4_isPremiumMissed_afterGrace_true() public {
        uint256 posId = _openCDS();
        vm.warp(block.timestamp + 90 days + 25 hours);
        assertTrue(premiumEngine.isPremiumMissed(posId));
    }

    function test_C5_collectPremium_afterMaturity_reverts() public {
        uint256 posId = _openCDS();
        vm.warp(block.timestamp + MATURITY_DAYS * 1 days + 1);
        cdsVault.expirePosition(posId);

        vm.prank(buyer);
        vm.expectRevert();
        premiumEngine.collectPremium(posId);
    }

    function test_D1_checkMargin_healthyPosition_noMarginCall() public {
        uint256 posId = _openCDS();
        marginEngine.checkMargin(posId);
        assertEq(marginEngine.marginCallTimestamp(posId), 0);
    }

    function test_D2_checkMargin_raisedSpread_triggersMarginCall() public {
        uint256 posId = _openCDS();

        vm.prank(keeper);
        creditOracle.setCreditData(entity, 100, 5000, RECOVERY_BPS);

        marginEngine.checkMargin(posId);
        assertTrue(marginEngine.marginCallTimestamp(posId) > 0);
    }

    function test_D3_topUpAfterMarginCall_resolvesCall() public {
        uint256 posId = _openCDS();

        vm.prank(keeper);
        creditOracle.setCreditData(entity, 100, 5000, RECOVERY_BPS);
        marginEngine.checkMargin(posId);
        assertTrue(marginEngine.marginCallTimestamp(posId) > 0);

        vm.prank(seller);
        cdsVault.topUpCollateral(posId, 200e6);

        vm.prank(keeper);
        creditOracle.setCreditData(entity, 800, 200, RECOVERY_BPS);
        marginEngine.checkMargin(posId);

        assertEq(marginEngine.marginCallTimestamp(posId), 0);
    }

    function test_D4_liquidatePosition_afterWindow_success() public {
        uint256 posId = _openCDS();

        vm.prank(keeper);
        creditOracle.setCreditData(entity, 100, 5000, RECOVERY_BPS);
        marginEngine.checkMargin(posId);

        uint256 deadline = marginEngine.getMarginCallDeadline(posId);
        vm.warp(deadline + 1);

        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        marginEngine.liquidatePosition(posId);

        assertTrue(usdc.balanceOf(buyer) > buyerBalBefore);
        CDSVault.CDSPosition memory pos = _getPosition(posId);
        assertEq(uint8(pos.state), uint8(CDSVault.PositionState.DEFAULTED));
    }

    function test_D5_liquidatePosition_beforeWindow_reverts() public {
        uint256 posId = _openCDS();

        vm.prank(keeper);
        creditOracle.setCreditData(entity, 100, 5000, RECOVERY_BPS);
        marginEngine.checkMargin(posId);

        vm.expectRevert(
            abi.encodeWithSelector(
                MarginEngine.MarginCallWindowNotExpired.selector,
                posId,
                marginEngine.getMarginCallDeadline(posId)
            )
        );
        marginEngine.liquidatePosition(posId);
    }

    function test_D6_isUnderwater_returnsBool() public {
        uint256 posId = _openCDS();
        assertFalse(marginEngine.isUnderwater(posId));

        vm.prank(keeper);
        creditOracle.setCreditData(entity, 100, 5000, RECOVERY_BPS);

        assertTrue(marginEngine.isUnderwater(posId));
    }

    function test_D7_computeMtM_zeroAtEntry() public {
        uint256 posId = _openCDS();
        assertEq(marginEngine.computeMtM(posId), 0);
    }

    function test_D8_computeMtM_positive_whenSpreadRises() public {
        uint256 posId = _openCDS();

        vm.prank(keeper);
        creditOracle.setCreditData(entity, 500, 500, RECOVERY_BPS);

        assertTrue(marginEngine.computeMtM(posId) > 0);
    }

    function test_E1_settleCDS_success() public {
        uint256 posId = _openCDS();

        vm.prank(keeper);
        creditOracle.markDefaulted(entity, true);

        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        uint256 sellerBalBefore = usdc.balanceOf(seller);

        settlementEngine.settleCDS(posId);

        assertEq(usdc.balanceOf(buyer), buyerBalBefore + 60e6);
        assertEq(usdc.balanceOf(seller), sellerBalBefore + 60e6);
        assertEq(uint8(_getPosition(posId).state), uint8(CDSVault.PositionState.DEFAULTED));
    }

    function test_E2_settleCDS_noCreditEvent_reverts() public {
        uint256 posId = _openCDS();
        vm.expectRevert();
        settlementEngine.settleCDS(posId);
    }

    function test_E3_settleCDS_alreadySettled_reverts() public {
        uint256 posId = _openCDS();

        vm.prank(keeper);
        creditOracle.markDefaulted(entity, true);

        settlementEngine.settleCDS(posId);

        vm.expectRevert();
        settlementEngine.settleCDS(posId);
    }

    function test_E4_batchSettleCDS_success() public {
        uint256 posId1 = _openCDSWithAmount(seller, 100e6);
        uint256 posId2 = _openCDSWithAmount(seller, 100e6);
        uint256 posId3 = _openCDSWithAmount(seller, 100e6);

        vm.prank(keeper);
        creditOracle.markDefaulted(entity, true);

        uint256[] memory ids = new uint256[](3);
        ids[0] = posId1;
        ids[1] = posId2;
        ids[2] = posId3;

        settlementEngine.batchSettleCDS(ids);

        assertEq(uint8(_getPosition(posId1).state), uint8(CDSVault.PositionState.DEFAULTED));
        assertEq(uint8(_getPosition(posId2).state), uint8(CDSVault.PositionState.DEFAULTED));
        assertEq(uint8(_getPosition(posId3).state), uint8(CDSVault.PositionState.DEFAULTED));
    }

    function test_E5_recoveryRateZero_usesDefaultRecovery() public {
        uint256 posId = _openCDS();

        vm.prank(owner);
        settlementEngine.setEntityRecoveryRate(entity, 0);

        vm.prank(keeper);
        creditOracle.markDefaulted(entity, true);

        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        settlementEngine.settleCDS(posId);

        assertEq(usdc.balanceOf(buyer), buyerBalBefore + 60e6);
    }

    function test_E6_previewPayout_correctValues() public {
        uint256 posId = _openCDS();

        (uint256 payout, uint256 surplus, uint256 recBps) = settlementEngine.previewPayout(posId);

        assertEq(payout, 60e6);
        assertEq(surplus, 60e6);
        assertEq(recBps, 4000);
    }

    function test_F1_deposit_success() public {
        uint256 supplyId = _deposit(lender, 200e6);
        LendingPool.SupplyPosition memory pos = lendingPool.getSupplyPosition(supplyId);

        assertEq(pos.lender, lender);
        assertEq(pos.amount, 200e6);
    }

    function test_F2_deposit_mintsLendingToken() public {
        uint256 balBefore = lendingToken.balanceOf(lender);
        _deposit(lender, 200e6);
        assertTrue(lendingToken.balanceOf(lender) > balBefore);
    }

    function test_F3_borrow_success() public {
        _deposit(lender, 3000e6);

        uint256 loanId = _borrow(borrower, WETH_LOCKED, LOAN_AMOUNT);
        LendingPool.LoanPosition memory loan = lendingPool.getLoanPosition(loanId);

        assertEq(loan.borrower, borrower);
        assertEq(loan.loanAmount, LOAN_AMOUNT);
        assertEq(loan.collateralAmount, WETH_LOCKED);
    }

    function test_F4_borrow_exceedsLTV_reverts() public {
        _deposit(lender, 3000e6);

        vm.prank(borrower);
        weth.approve(address(lendingPool), WETH_LOCKED);

        vm.prank(borrower);
        vm.expectRevert();
        lendingPool.borrow(WETH_LOCKED, 1600e6, 0);
    }

    function test_F5_repay_fullRepayment_success() public {
        _deposit(lender, 3000e6);
        uint256 loanId = _borrow(borrower, WETH_LOCKED, LOAN_AMOUNT);

        vm.warp(block.timestamp + 30 days);

        usdc.mint(borrower, 100e6);
        vm.prank(borrower);
        usdc.approve(address(lendingPool), type(uint256).max);

        uint256 wethBefore = weth.balanceOf(borrower);

        vm.prank(borrower);
        lendingPool.repay(loanId);

        assertEq(weth.balanceOf(borrower), wethBefore + WETH_LOCKED);
        assertEq(uint8(lendingPool.getLoanPosition(loanId).state), uint8(LendingPool.LoanState.REPAID));
    }

    function test_F6_healthFactor_aboveOne_healthy() public {
        _deposit(lender, 3000e6);
        uint256 loanId = _borrow(borrower, WETH_LOCKED, LOAN_AMOUNT);

        assertTrue(lendingPool.getHealthFactor(loanId) >= 10000);
    }

    function test_F7_liquidate_whenHealthFactorBelowOne() public {
        _deposit(lender, 3000e6);
        uint256 loanId = _borrow(borrower, WETH_LOCKED, LOAN_AMOUNT);

        vm.prank(owner);
        lendingPool.setWethPrice(1800e6);

        assertTrue(lendingPool.getHealthFactor(loanId) < 10000);

        vm.prank(liquidator);
        usdc.approve(address(lendingPool), type(uint256).max);

        uint256 wethBefore = weth.balanceOf(liquidator);

        vm.prank(liquidator);
        lendingPool.liquidate(loanId);

        assertTrue(weth.balanceOf(liquidator) > wethBefore);
        assertEq(uint8(lendingPool.getLoanPosition(loanId).state), uint8(LendingPool.LoanState.LIQUIDATED));
    }

    function test_F8_liquidate_healthyPosition_reverts() public {
        _deposit(lender, 3000e6);
        uint256 loanId = _borrow(borrower, WETH_LOCKED, LOAN_AMOUNT);

        vm.prank(liquidator);
        vm.expectRevert();
        lendingPool.liquidate(loanId);
    }

    function test_F9_getLiquidationPrice_calculation() public {
        _deposit(lender, 3000e6);
        uint256 loanId = _borrow(borrower, WETH_LOCKED, LOAN_AMOUNT);

        uint256 liqPrice = lendingPool.getLiquidationPrice(loanId);
        assertTrue(liqPrice > 0);
        assertApproxEqAbs(liqPrice, 1875e6, 10e6);
    }

    function test_F10_getNetAPY_withoutCDS() public {
        uint256 supplyId = _deposit(lender, 200e6);
        assertEq(lendingPool.getNetAPY(supplyId), 500);
    }

    function test_G1_enableCDSProtection_success() public {
        uint256 supplyId = _deposit(lender, 200e6);

        vm.prank(lender);
        lendingPool.enableCDSProtection(supplyId, seller);

        LendingPool.SupplyPosition memory pos = lendingPool.getSupplyPosition(supplyId);
        assertTrue(pos.cdsProtectionEnabled);
        assertTrue(pos.cdsPositionId > 0);
    }

    function test_G2_getNetAPY_withCDS_reduced() public {
        uint256 supplyId = _deposit(lender, 200e6);

        vm.prank(lender);
        lendingPool.enableCDSProtection(supplyId, seller);

        assertEq(lendingPool.getNetAPY(supplyId), 400);
    }

    function test_G3_borrowerLiquidation_reportsToCreditOracle() public {
        _deposit(lender, 3000e6);
        uint256 loanId = _borrow(borrower, WETH_LOCKED, LOAN_AMOUNT);

        vm.prank(owner);
        lendingPool.setWethPrice(1800e6);

        vm.prank(liquidator);
        usdc.approve(address(lendingPool), type(uint256).max);

        vm.prank(liquidator);
        lendingPool.liquidate(loanId);

        CreditOracle.DefaultRecord memory rec = creditOracle.getBorrowerDefault(borrower);
        assertTrue(rec.exists);
        assertEq(rec.loanId, loanId);
    }

    function test_H1_setCreditData_success() public {
        vm.prank(keeper);
        creditOracle.setCreditData(entity, 900, 100, 5000);

        (uint256 score, uint256 lambda, uint256 recovery, ) = creditOracle.getCreditData(entity);
        assertEq(score, 900);
        assertEq(lambda, 100);
        assertEq(recovery, 5000);
    }

    function test_H2_setCreditData_invalidRecovery_reverts() public {
        vm.prank(keeper);
        vm.expectRevert(CreditOracle.RecoveryOutOfRange.selector);
        creditOracle.setCreditData(entity, 900, 100, 10001);
    }

    function test_H3_markDefaulted_setsFlag() public {
        vm.prank(keeper);
        creditOracle.markDefaulted(entity, true);

        assertTrue(creditOracle.isCreditEventDeclared(entity));
    }

    function test_H4_getSpread_returnsCorrectly() public {
        vm.prank(keeper);
        creditOracle.setCreditData(entity, 800, 350, 4000);

        assertEq(creditOracle.getSpread(entity), 350);
    }

    function test_H5_isStale_freshData_false() public {
        vm.prank(keeper);
        creditOracle.setCreditData(entity, 800, 200, 4000);
        assertFalse(creditOracle.isStale(entity));
    }

    function test_H6_isStale_oldData_true() public {
        vm.prank(keeper);
        creditOracle.setCreditData(entity, 800, 200, 4000);
        vm.warp(block.timestamp + 3 hours);
        assertTrue(creditOracle.isStale(entity));
    }

    function test_H7_getHazardRate_returnsCorrectly() public {
        vm.prank(keeper);
        creditOracle.setCreditData(entity, 800, 333, 4000);
        assertEq(creditOracle.getHazardRate(entity), 333);
    }

    function test_I1_setEngines_onlyOwner() public {
        vm.prank(buyer);
        vm.expectRevert();
        cdsVault.setEngines(address(1), address(2), address(3));
    }

    function test_I2_executePayout_onlySettlementEngine() public {
        uint256 posId = _openCDS();

        vm.prank(buyer);
        vm.expectRevert(CDSVault.OnlyAuthorizedEngine.selector);
        cdsVault.executePayout(posId, RECOVERY_BPS);
    }

    function test_I3_setMarginCall_onlyMarginEngine() public {
        uint256 posId = _openCDS();

        vm.prank(buyer);
        vm.expectRevert(CDSVault.OnlyMarginEngine.selector);
        cdsVault.setMarginCall(posId);
    }

    function test_I4_setCreditData_onlyUpdaterOrOwner() public {
        vm.prank(buyer);
        vm.expectRevert(CreditOracle.NotAuthorizedUpdater.selector);
        creditOracle.setCreditData(entity, 500, 200, 4000);
    }

    function test_I5_pause_onlyOwner() public {
        vm.prank(buyer);
        vm.expectRevert();
        cdsVault.pause();
    }

    function test_I6_paused_openCDS_reverts() public {
        vm.prank(owner);
        cdsVault.pause();

        vm.prank(seller);
        vm.expectRevert();
        cdsVault.openCDS(buyer, seller, entity, NOTIONAL, SPREAD_BPS, MATURITY_DAYS);
    }

    function test_J1_expirePosition_alreadyExpired_reverts() public {
        uint256 posId = _openCDS();
        vm.warp(block.timestamp + MATURITY_DAYS * 1 days + 1);
        cdsVault.expirePosition(posId);

        vm.expectRevert(abi.encodeWithSelector(CDSVault.PositionNotActive.selector, posId));
        cdsVault.expirePosition(posId);
    }

    function test_J2_settleCDS_expiredPosition_reverts() public {
        uint256 posId = _openCDS();
        vm.warp(block.timestamp + MATURITY_DAYS * 1 days + 1);
        cdsVault.expirePosition(posId);

        vm.prank(keeper);
        creditOracle.markDefaulted(entity, true);

        vm.expectRevert();
        settlementEngine.settleCDS(posId);
    }

    function test_J3_checkMargin_inactivePosition_skips() public {
        uint256 posId = _openCDS();
        vm.warp(block.timestamp + MATURITY_DAYS * 1 days + 1);
        cdsVault.expirePosition(posId);

        marginEngine.checkMargin(posId);
        assertEq(marginEngine.marginCallTimestamp(posId), 0);
    }

    function test_J4_openCDS_zeroSpread_reverts() public {
        vm.prank(seller);
        vm.expectRevert(CDSVault.ZeroAmount.selector);
        cdsVault.openCDS(buyer, seller, entity, NOTIONAL, 0, MATURITY_DAYS);
    }

    function test_J5_openCDS_zeroMaturity_reverts() public {
        vm.prank(seller);
        vm.expectRevert(CDSVault.InvalidMaturity.selector);
        cdsVault.openCDS(buyer, seller, entity, NOTIONAL, SPREAD_BPS, 0);
    }

    function test_J6_topUpCollateral_zero_reverts() public {
        uint256 posId = _openCDS();

        vm.prank(seller);
        vm.expectRevert(CDSVault.ZeroAmount.selector);
        cdsVault.topUpCollateral(posId, 0);
    }

    function test_J7_liquidatePosition_noMarginCall_reverts() public {
        uint256 posId = _openCDS();

        vm.expectRevert(abi.encodeWithSelector(MarginEngine.NoMarginCallActive.selector, posId));
        marginEngine.liquidatePosition(posId);
    }

    function test_J8_sellerCollateralTracking_correct() public {
        uint256 posId = _openCDS();
        assertEq(cdsVault.sellerCollateral(seller), COLLATERAL_120);

        vm.warp(block.timestamp + MATURITY_DAYS * 1 days + 1);
        cdsVault.expirePosition(posId);

        assertEq(cdsVault.sellerCollateral(seller), 0);
    }

    function testFuzz_openCDS_collateralAlways120Percent(uint256 notional) public {
        notional = bound(notional, 1e6, 100_000e6);

        uint256 required = (notional * 12000) / 10000;
        usdc.mint(seller, required);

        vm.prank(seller);
        uint256 posId = cdsVault.openCDS(buyer, seller, entity, notional, SPREAD_BPS, MATURITY_DAYS);

        CDSVault.CDSPosition memory pos = _getPosition(posId);
        assertEq(pos.collateral, required);
    }

    function testFuzz_getLiquidationPrice_alwaysPositive(uint256 loanAmt, uint256 collateral) public {
        collateral = bound(collateral, 1e18, 10e18);

        _deposit(lender, 5_000e6);

        uint256 maxLoan = ((collateral * WETH_PRICE) / 1e18) * 7500 / 10000;
        if (maxLoan > 5_000e6) {
            maxLoan = 5_000e6;
        }
        maxLoan = bound(maxLoan, 1e6, 5_000e6);
        loanAmt = bound(loanAmt, 1e6, maxLoan);

        weth.mint(borrower, collateral);

        vm.prank(borrower);
        weth.approve(address(lendingPool), collateral);

        vm.prank(borrower);
        uint256 loanId = lendingPool.borrow(collateral, loanAmt, 0);

        assertTrue(lendingPool.getLiquidationPrice(loanId) > 0);
    }

    function _openCDS() internal returns (uint256 posId) {
        vm.prank(seller);
        posId = cdsVault.openCDS(buyer, seller, entity, NOTIONAL, SPREAD_BPS, MATURITY_DAYS);
    }

    function _openCDSWithAmount(address _seller, uint256 notional) internal returns (uint256 posId) {
        vm.prank(_seller);
        posId = cdsVault.openCDS(buyer, _seller, entity, notional, SPREAD_BPS, MATURITY_DAYS);
    }

    function _deposit(address _lender, uint256 amount) internal returns (uint256 supplyId) {
        vm.prank(_lender);
        usdc.approve(address(lendingPool), amount);

        vm.prank(_lender);
        supplyId = lendingPool.deposit(amount);
    }

    function _borrow(address _borrower, uint256 collateral, uint256 loanAmount)
        internal
        returns (uint256 loanId)
    {
        vm.prank(_borrower);
        weth.approve(address(lendingPool), collateral);

        vm.prank(_borrower);
        loanId = lendingPool.borrow(collateral, loanAmount, 0);
    }

    function _getPosition(uint256 posId) internal view returns (CDSVault.CDSPosition memory) {
        return cdsVault.getPosition(posId);
    }
}
