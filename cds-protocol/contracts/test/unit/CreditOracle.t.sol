// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CreditOracle} from "../../src/oracle/CreditOracle.sol";

contract CreditOracleTest is Test {
    CreditOracle internal oracle;

    address internal owner = address(0xA11CE);
    address internal updater = address(0xB0B);
    address internal reporter = address(0xCAFE);
    address internal borrower = address(0xD00D);

    function setUp() external {
        vm.prank(owner);
        oracle = new CreditOracle(owner);
    }

    function testOnlyOwnerCanSetAuthorizedReporter() external {
        vm.expectRevert();
        oracle.setAuthorizedReporter(reporter, true);

        vm.prank(owner);
        oracle.setAuthorizedReporter(reporter, true);
        assertTrue(oracle.authorizedReporters(reporter));
    }

    function testReportLendingDefaultMarksBorrowerDefaulted() external {
        vm.prank(owner);
        oracle.setAuthorizedReporter(reporter, true);

        vm.warp(1_000);
        vm.prank(reporter);
        oracle.reportLendingDefault(borrower, 7, 12_500e6);

        CreditOracle.DefaultRecord memory rec = oracle.getBorrowerDefault(borrower);
        assertTrue(rec.exists);
        assertEq(rec.loanId, 7);
        assertEq(rec.loanAmount, 12_500e6);
        assertEq(rec.timestamp, 1_000);

        (, , , bool defaulted_) = oracle.getCreditData(borrower);
        assertTrue(defaulted_);
        assertTrue(oracle.isCreditEventDeclared(borrower));
    }

    function testOnlyUpdaterOrOwnerCanSetCreditData() external {
        vm.expectRevert(CreditOracle.NotAuthorizedUpdater.selector);
        oracle.setCreditData(borrower, 650, 120, 4_000);

        vm.prank(owner);
        oracle.setUpdater(updater, true);

        vm.prank(updater);
        oracle.setCreditData(borrower, 700, 150, 3_500);

        (uint256 score, uint256 lambdaBps, uint256 recoveryBps, bool defaulted_) =
            oracle.getCreditData(borrower);

        assertEq(score, 700);
        assertEq(lambdaBps, 150);
        assertEq(recoveryBps, 3_500);
        assertFalse(defaulted_);
        assertEq(oracle.getSpread(borrower), 150);
    }
}
