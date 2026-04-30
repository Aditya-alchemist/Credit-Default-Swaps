// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ILendingToken} from "../interfaces/ILendingToken.sol";
import {ICDSVault} from "../interfaces/ICDSVault.sol";
import {IPremiumEngine} from "../interfaces/IPremiumEngine.sol";
import {IMarginEngine} from "../interfaces/IMarginEngine.sol";
import {ICreditOracle} from "../interfaces/ICreditOracle.sol";

contract LendingPool is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    //  TYPES
    // ─────────────────────────────────────────────

    enum LoanState {
        ACTIVE,
        REPAID,
        LIQUIDATED
    }

    struct SupplyPosition {
        address lender;
        uint256 amount;             // USDC deposited
        uint256 lTokenAmount;       // lTokens minted
        uint256 depositTimestamp;
        bool cdsProtectionEnabled;  // lender bought CDS on this deposit
        uint256 cdsPositionId;      // positionId in CDSVault (0 if no protection)
    }

    struct LoanPosition {
        address borrower;
        uint256 loanAmount;         // USDC borrowed (6 decimals)
        uint256 collateralAmount;   // WETH locked (18 decimals)
        uint256 interestRateBps;    // annual interest in bps e.g. 500 = 5%
        uint256 openTimestamp;
        uint256 lastInterestAccrued;
        uint256 accruedInterest;    // total interest owed so far
        uint256 duration;           // loan duration in seconds (0 = open-ended)
        LoanState state;
    }

    // ─────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────

    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IERC20 public immutable usdc;       // loan asset
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IERC20 public immutable weth;       // collateral asset
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    ILendingToken public immutable lToken;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    ICDSVault public immutable cdsVault;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IPremiumEngine public immutable premiumEngine;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IMarginEngine public immutable marginEngine;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    ICreditOracle public immutable creditOracle;

    // LTV = 75% — borrower can borrow up to 75% of collateral value
    uint256 public constant LTV_BPS = 7500;

    // collateral factor for health factor calc
    uint256 public constant COLLATERAL_FACTOR_BPS = 8000; // 80%

    // liquidation threshold — HF below this → liquidatable
    uint256 public constant LIQUIDATION_THRESHOLD_BPS = 10000; // HF < 1.0

    // base interest rate 5% per year
    uint256 public constant BASE_INTEREST_RATE_BPS = 500;

    // CDS protection spread charged on deposits (100bps = 1%/year)
    uint256 public constant CDS_PROTECTION_SPREAD_BPS = 100;
    uint256 public constant CDS_PROTECTION_TENOR_DAYS = 365;

    // WETH/USDC price — in production replaced by Chainlink oracle
    // 1 WETH = 2000 USDC (mock price for testnet)
    uint256 public wethPriceUsdc = 2000e6; // 2000 USDC per WETH (6 decimals)

    uint256 public nextSupplyId;
    uint256 public nextLoanId;

    // total USDC supplied to pool
    uint256 public totalSupplied;

    // total USDC borrowed from pool
    uint256 public totalBorrowed;

    // total interest collected (protocol revenue)
    uint256 public totalInterestCollected;

    mapping(uint256 => SupplyPosition) public supplyPositions;
    mapping(uint256 => LoanPosition) public loanPositions;

    // borrower address → array of active loanIds
    mapping(address => uint256[]) public borrowerLoans;

    // lender address → array of supplyIds
    mapping(address => uint256[]) public lenderSupplies;

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────

    event Deposited(
        uint256 indexed supplyId,
        address indexed lender,
        uint256 amount,
        uint256 lTokensMinted
    );

    event Withdrawn(
        uint256 indexed supplyId,
        address indexed lender,
        uint256 amount,
        uint256 lTokensBurned
    );

    event Borrowed(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 loanAmount,
        uint256 collateralAmount,
        uint256 interestRateBps
    );

    event Repaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 principal,
        uint256 interest,
        uint256 collateralReleased
    );

    event Liquidated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed liquidator,
        uint256 collateralSeized
    );

    event CDSProtectionEnabled(
        uint256 indexed supplyId,
        uint256 indexed cdsPositionId
    );

    event WethPriceUpdated(uint256 newPrice);

    event InterestAccrued(
        uint256 indexed loanId,
        uint256 interest,
        uint256 totalAccrued
    );

    event BorrowerDefaulted(
        address indexed borrower,
        uint256 indexed loanId,
        uint256 loanAmount,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error InsufficientPoolLiquidity(uint256 available, uint256 requested);
    error ExceedsLTV(uint256 maxLoan, uint256 requested);
    error LoanNotActive(uint256 loanId);
    error SupplyNotActive(uint256 supplyId);
    error NotBorrower(uint256 loanId);
    error NotLender(uint256 supplyId);
    error HealthFactorHealthy(uint256 hf);
    error CDSAlreadyEnabled(uint256 supplyId);
    error InsufficientLTokens(uint256 have, uint256 need);
    error LoanDurationNotExpired(uint256 loanId);

    // ─────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────

    constructor(
        address _usdc,
        address _weth,
        address _lToken,
        address _cdsVault,
        address _premiumEngine,
        address _marginEngine,
        address _creditOracle,
        address _owner
    ) Ownable(_owner) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_weth == address(0)) revert ZeroAddress();
        if (_lToken == address(0)) revert ZeroAddress();
        if (_cdsVault == address(0)) revert ZeroAddress();
        if (_premiumEngine == address(0)) revert ZeroAddress();
        if (_marginEngine == address(0)) revert ZeroAddress();
        if (_creditOracle == address(0)) revert ZeroAddress();

        usdc = IERC20(_usdc);
        weth = IERC20(_weth);
        lToken = ILendingToken(_lToken);
        cdsVault = ICDSVault(_cdsVault);
        premiumEngine = IPremiumEngine(_premiumEngine);
        marginEngine = IMarginEngine(_marginEngine);
        creditOracle = ICreditOracle(_creditOracle);

        nextSupplyId = 1;
        nextLoanId = 1;
    }

    // ─────────────────────────────────────────────
    //  ADMIN
    // ─────────────────────────────────────────────

    function setWethPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert ZeroAmount();
        wethPriceUsdc = newPrice;
        emit WethPriceUpdated(newPrice);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─────────────────────────────────────────────
    //  LENDER — DEPOSIT
    // ─────────────────────────────────────────────

    /**
     * @notice Lender deposits USDC into the pool.
     *         Receives lTokens representing their share.
     *         lToken amount = deposit amount (1:1 at start, grows with interest).
     *
     * @param amount   USDC amount to deposit (6 decimals)
     */
    function deposit(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 supplyId)
    {
        if (amount == 0) revert ZeroAmount();

        // ── Effects ───────────────────────────────
        supplyId = nextSupplyId++;

        // lTokens minted = proportional to pool share
        uint256 lTokensToMint = _computeLTokensToMint(amount);

        supplyPositions[supplyId] = SupplyPosition({
            lender: msg.sender,
            amount: amount,
            lTokenAmount: lTokensToMint,
            depositTimestamp: block.timestamp,
            cdsProtectionEnabled: false,
            cdsPositionId: 0
        });

        lenderSupplies[msg.sender].push(supplyId);
        totalSupplied += amount;

        // ── Interactions ──────────────────────────
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        lToken.mint(msg.sender, lTokensToMint);

        emit Deposited(supplyId, msg.sender, amount, lTokensToMint);
    }

    // ─────────────────────────────────────────────
    //  LENDER — WITHDRAW
    // ─────────────────────────────────────────────

    /**
     * @notice Lender withdraws by burning lTokens.
     *         Gets back USDC proportional to their pool share.
     *
     * @param supplyId      their supply position
     * @param lTokenAmount  how many lTokens to burn
     */
    function withdraw(uint256 supplyId, uint256 lTokenAmount)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 usdcOut)
    {
        SupplyPosition storage pos = supplyPositions[supplyId];

        if (pos.lender != msg.sender) revert NotLender(supplyId);
        if (pos.amount == 0) revert SupplyNotActive(supplyId);
        if (lTokenAmount == 0) revert ZeroAmount();
        if (lToken.balanceOf(msg.sender) < lTokenAmount)
            revert InsufficientLTokens(lToken.balanceOf(msg.sender), lTokenAmount);

        // how much USDC do these lTokens represent right now
        usdcOut = _computeUsdcFromLTokens(lTokenAmount);

        // check pool has enough liquidity
        uint256 availableLiquidity = totalSupplied - totalBorrowed;
        if (usdcOut > availableLiquidity)
            revert InsufficientPoolLiquidity(availableLiquidity, usdcOut);

        // ── Effects ───────────────────────────────
        pos.amount -= usdcOut;
        pos.lTokenAmount -= lTokenAmount;
        totalSupplied -= usdcOut;

        // ── Interactions ──────────────────────────
        lToken.burn(msg.sender, lTokenAmount);
        usdc.safeTransfer(msg.sender, usdcOut);

        emit Withdrawn(supplyId, msg.sender, usdcOut, lTokenAmount);
    }

    // ─────────────────────────────────────────────
    //  BORROWER — BORROW
    // ─────────────────────────────────────────────

    /**
     * @notice Borrower locks WETH collateral and draws a USDC loan.
     *
     *  Health Factor must stay above 1.0:
     *  HF = (collateralUSD × collateralFactor) / loanAmount
     *
     *  Max loan = collateralUSD × LTV (75%)
     *
     * @param collateralAmount  WETH to lock (18 decimals)
     * @param loanAmount        USDC to borrow (6 decimals)
     * @param duration          loan duration in seconds (0 = open-ended)
     */
    function borrow(
        uint256 collateralAmount,
        uint256 loanAmount,
        uint256 duration
    )
        external
        nonReentrant
        whenNotPaused
        returns (uint256 loanId)
    {
        if (collateralAmount == 0) revert ZeroAmount();
        if (loanAmount == 0) revert ZeroAmount();

        // collateral value in USDC
        uint256 collateralValueUsdc = _getCollateralValue(collateralAmount);

        // max loan = 75% of collateral value
        uint256 maxLoan = (collateralValueUsdc * LTV_BPS) / 10000;
        if (loanAmount > maxLoan) revert ExceedsLTV(maxLoan, loanAmount);

        // pool must have enough liquidity
        uint256 availableLiquidity = totalSupplied - totalBorrowed;
        if (loanAmount > availableLiquidity)
            revert InsufficientPoolLiquidity(availableLiquidity, loanAmount);

        // ── Effects ───────────────────────────────
        loanId = nextLoanId++;

        loanPositions[loanId] = LoanPosition({
            borrower: msg.sender,
            loanAmount: loanAmount,
            collateralAmount: collateralAmount,
            interestRateBps: BASE_INTEREST_RATE_BPS,
            openTimestamp: block.timestamp,
            lastInterestAccrued: block.timestamp,
            accruedInterest: 0,
            duration: duration,
            state: LoanState.ACTIVE
        });

        borrowerLoans[msg.sender].push(loanId);
        totalBorrowed += loanAmount;

        // ── Interactions ──────────────────────────
        // pull WETH collateral from borrower into this contract
        weth.safeTransferFrom(msg.sender, address(this), collateralAmount);

        // send USDC loan to borrower
        usdc.safeTransfer(msg.sender, loanAmount);

        emit Borrowed(
            loanId,
            msg.sender,
            loanAmount,
            collateralAmount,
            BASE_INTEREST_RATE_BPS
        );
    }

    // ─────────────────────────────────────────────
    //  BORROWER — REPAY
    // ─────────────────────────────────────────────

    /**
     * @notice Borrower repays principal + accrued interest.
     *         Collateral released back atomically.
     *
     * @param loanId  the loan to repay
     */
    function repay(uint256 loanId)
        external
        nonReentrant
        whenNotPaused
    {
        LoanPosition storage loan = loanPositions[loanId];

        if (loan.state != LoanState.ACTIVE) revert LoanNotActive(loanId);
        if (loan.borrower != msg.sender) revert NotBorrower(loanId);

        // accrue any pending interest first
        _accrueInterest(loanId);

        uint256 totalOwed = loan.loanAmount + loan.accruedInterest;
        uint256 collateralToReturn = loan.collateralAmount;

        // ── Effects ───────────────────────────────
        loan.state = LoanState.REPAID;
        totalBorrowed -= loan.loanAmount;
        totalInterestCollected += loan.accruedInterest;
        totalSupplied += loan.accruedInterest; // interest goes back into pool

        // ── Interactions ──────────────────────────
        // pull principal + interest from borrower
        usdc.safeTransferFrom(msg.sender, address(this), totalOwed);

        // return WETH collateral to borrower
        weth.safeTransfer(msg.sender, collateralToReturn);

        emit Repaid(
            loanId,
            msg.sender,
            loan.loanAmount,
            loan.accruedInterest,
            collateralToReturn
        );
    }

    // ─────────────────────────────────────────────
    //  LIQUIDATION — called by MarginEngine / anyone
    // ─────────────────────────────────────────────

    /**
     * @notice Liquidate a borrower whose health factor dropped below 1.0.
     *         Liquidator repays the loan, receives collateral at a 5% bonus.
     *
     * @param loanId  the underwater loan
     */
    function liquidate(uint256 loanId)
        external
        nonReentrant
        whenNotPaused
    {
        LoanPosition storage loan = loanPositions[loanId];

        if (loan.state != LoanState.ACTIVE) revert LoanNotActive(loanId);

        // accrue any pending interest first
        _accrueInterest(loanId);

        // check health factor is below 1.0
        uint256 hf = getHealthFactor(loanId);
        if (hf >= 10000) revert HealthFactorHealthy(hf);  // HF >= 1.0 (in bps)

        uint256 totalOwed = loan.loanAmount + loan.accruedInterest;
        uint256 collateral = loan.collateralAmount;

        // liquidator gets collateral worth 105% of the debt when available,
        // with any leftover collateral returned to the borrower.
        uint256 liquidationValueUsdc = (totalOwed * 10500) / 10000;
        uint256 collateralToLiquidator = (liquidationValueUsdc * 1e18) / wethPriceUsdc;
        if (collateralToLiquidator > collateral) {
            collateralToLiquidator = collateral;
        }
        uint256 collateralToBorrower = collateral - collateralToLiquidator;

        // ── Effects ───────────────────────────────
        loan.state = LoanState.LIQUIDATED;
        loan.collateralAmount = 0;
        totalBorrowed -= loan.loanAmount;
        totalInterestCollected += loan.accruedInterest;
        totalSupplied += loan.accruedInterest;

        // ── Interactions ──────────────────────────
        // liquidator repays the debt
        usdc.safeTransferFrom(msg.sender, address(this), totalOwed);

        // liquidator receives WETH collateral
        weth.safeTransfer(msg.sender, collateralToLiquidator);
        if (collateralToBorrower > 0) {
            weth.safeTransfer(loan.borrower, collateralToBorrower);
        }

        _triggerCDSSettlement(loan.borrower, loanId, loan.loanAmount);

        emit Liquidated(loanId, loan.borrower, msg.sender, collateralToLiquidator);
    }

    function _triggerCDSSettlement(
        address borrower,
        uint256 loanId,
        uint256 loanAmount
    ) internal {
        creditOracle.reportLendingDefault(borrower, loanId, loanAmount);
        emit BorrowerDefaulted(borrower, loanId, loanAmount, block.timestamp);
    }

    // ─────────────────────────────────────────────
    //  CDS PROTECTION ON SUPPLY
    // ─────────────────────────────────────────────

    /**
     * @notice Lender enables CDS protection on their supply position.
     *         Opens an inner CDS in CDSVault with this pool as reference entity.
     *         Premium is 100bps/year deducted from their yield going forward.
     *
     * @param supplyId  their supply position to protect
     */
    // forge-lint: disable-next-line(mixed-case-function)
    function enableCDSProtection(uint256 supplyId, address seller)
        external
        nonReentrant
        whenNotPaused
    {
        SupplyPosition storage pos = supplyPositions[supplyId];

        if (pos.lender != msg.sender) revert NotLender(supplyId);
        if (pos.amount == 0) revert SupplyNotActive(supplyId);
        if (pos.cdsProtectionEnabled) revert CDSAlreadyEnabled(supplyId);
        if (seller == address(0)) revert ZeroAddress();

        uint256 cdsPositionId = cdsVault.openCDS(
            msg.sender,
            seller,
            address(this),
            pos.amount,
            CDS_PROTECTION_SPREAD_BPS,
            CDS_PROTECTION_TENOR_DAYS
        );

        pos.cdsProtectionEnabled = true;
        pos.cdsPositionId = cdsPositionId;

        emit CDSProtectionEnabled(supplyId, cdsPositionId);
    }

    // ─────────────────────────────────────────────
    //  INTEREST ACCRUAL (internal)
    // ─────────────────────────────────────────────

    /**
     * @notice Accrues interest on a loan using ACT/365 convention.
     *
     *  Interest = loanAmount × interestRateBps × days / (10000 × 365)
     */
    function _accrueInterest(uint256 loanId) internal {
        LoanPosition storage loan = loanPositions[loanId];

        uint256 timeElapsed = block.timestamp - loan.lastInterestAccrued;
        if (timeElapsed == 0) return;

        // ACT/365 interest accrual
        uint256 interest = (loan.loanAmount * loan.interestRateBps * timeElapsed)
            / (10000 * 365 days);

        loan.accruedInterest += interest;
        loan.lastInterestAccrued = block.timestamp;

        emit InterestAccrued(loanId, interest, loan.accruedInterest);
    }

    // ─────────────────────────────────────────────
    //  INTERNAL MATH
    // ─────────────────────────────────────────────

    /**
     * @notice Compute lTokens to mint on deposit.
     *         If pool is empty → 1:1 mint
     *         If pool has assets → proportional to pool share
     */
    function _computeLTokensToMint(uint256 usdcAmount)
        internal
        view
        returns (uint256)
    {
        uint256 totalLTokenSupply = lToken.totalSupply();

        if (totalLTokenSupply == 0 || totalSupplied == 0) {
            return usdcAmount; // 1:1 at start
        }

        // shares = deposit × totalSupply / totalAssets
        return (usdcAmount * totalLTokenSupply) / totalSupplied;
    }

    /**
     * @notice Compute USDC value of lTokens being burned.
     */
    function _computeUsdcFromLTokens(uint256 lTokenAmount)
        internal
        view
        returns (uint256)
    {
        uint256 totalLTokenSupply = lToken.totalSupply();
        if (totalLTokenSupply == 0) return 0;

        // usdc = lTokenAmount × totalAssets / totalSupply
        return (lTokenAmount * totalSupplied) / totalLTokenSupply;
    }

    /**
     * @notice Get USDC value of WETH collateral.
     *         Uses mock price in V1, Chainlink in V2.
     */
    function _getCollateralValue(uint256 wethAmount)
        internal
        view
        returns (uint256)
    {
        // wethAmount is 18 decimals, wethPriceUsdc is 6 decimals
        // result should be 6 decimals (USDC)
        return (wethAmount * wethPriceUsdc) / 1e18;
    }

    // ─────────────────────────────────────────────
    //  VIEWS
    // ─────────────────────────────────────────────

    /**
     * @notice Health Factor for a loan position (in bps, 10000 = 1.0)
     *
     *  HF = (collateralUSD × collateralFactor) / totalOwed
     *
     *  HF >= 10000 (1.0) → safe
     *  HF <  10000 (1.0) → liquidatable
     */
    function getHealthFactor(uint256 loanId)
        public
        view
        returns (uint256 hfBps)
    {
        LoanPosition memory loan = loanPositions[loanId];
        if (loan.state != LoanState.ACTIVE) return 0;

        uint256 collateralValueUsdc = _getCollateralValue(loan.collateralAmount);
        uint256 adjustedCollateral = (collateralValueUsdc * COLLATERAL_FACTOR_BPS) / 10000;
        uint256 totalOwed = loan.loanAmount + loan.accruedInterest;

        if (totalOwed == 0) return type(uint256).max;

        hfBps = (adjustedCollateral * 10000) / totalOwed;
    }

    /**
     * @notice Liquidation price — WETH price at which HF hits 1.0
     *
     *  P_liq = totalOwed / (collateralQty × collateralFactor)
     */
    function getLiquidationPrice(uint256 loanId)
        external
        view
        returns (uint256 liqPriceUsdc)
    {
        LoanPosition memory loan = loanPositions[loanId];
        uint256 totalOwed = loan.loanAmount + loan.accruedInterest;
        uint256 collateralFactor = COLLATERAL_FACTOR_BPS;

        // liqPrice = totalOwed × 1e18 / (collateralAmount × CF / 10000)
        liqPriceUsdc = (totalOwed * 1e18 * 10000)
            / (loan.collateralAmount * collateralFactor);
    }

    /**
     * @notice Get net APY for a supply position (gross APY - CDS spread if enabled)
     *
     *  Gross APY = BASE_INTEREST_RATE_BPS = 500bps = 5%
     *  Net APY   = 500 - 100 = 400bps = 4% (if CDS protection enabled)
     */
    // forge-lint: disable-next-line(mixed-case-function)
    function getNetAPY(uint256 supplyId)
        external
        view
        returns (uint256 netApyBps)
    {
        SupplyPosition memory pos = supplyPositions[supplyId];
        uint256 grossApy = BASE_INTEREST_RATE_BPS;

        if (pos.cdsProtectionEnabled) {
            netApyBps = grossApy - CDS_PROTECTION_SPREAD_BPS;
        } else {
            netApyBps = grossApy;
        }
    }

    function getSupplyPosition(uint256 supplyId)
        external
        view
        returns (SupplyPosition memory)
    {
        return supplyPositions[supplyId];
    }

    function getLoanPosition(uint256 loanId)
        external
        view
        returns (LoanPosition memory)
    {
        return loanPositions[loanId];
    }

    function getAvailableLiquidity() external view returns (uint256) {
        return totalSupplied - totalBorrowed;
    }

    function getUtilizationRate() external view returns (uint256 utilizationBps) {
        if (totalSupplied == 0) return 0;
        utilizationBps = (totalBorrowed * 10000) / totalSupplied;
    }

    function getBorrowerLoans(address borrower)
        external
        view
        returns (uint256[] memory)
    {
        return borrowerLoans[borrower];
    }

    function getLenderSupplies(address lender)
        external
        view
        returns (uint256[] memory)
    {
        return lenderSupplies[lender];
    }

    // ─────────────────────────────────────────────
    //  PUBLIC INTEREST ACCRUAL — callable by keeper
    // ─────────────────────────────────────────────

    function accrueInterest(uint256 loanId) external {
        LoanPosition storage loan = loanPositions[loanId];
        if (loan.state != LoanState.ACTIVE) revert LoanNotActive(loanId);
        _accrueInterest(loanId);
    }
}