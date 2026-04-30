// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPremiumEngine} from "../interfaces/IPremiumEngine.sol";

interface ICDSToken {
    function mintPosition(address buyer, address seller, uint256 positionId) external;

    function burnPosition(uint256 positionId) external;
}

contract CDSVault is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    //  TYPES
    // ─────────────────────────────────────────────

    enum PositionState {
        ACTIVE,
        MARGIN_CALL,
        DEFAULTED,
        EXPIRED
    }

    // forge-lint: disable-next-line(pascal-case-struct)
    struct CDSPosition {
        address buyer;              // protection buyer
        address seller;             // protection seller (underwriter)
        address referenceEntity;    // protocol/wallet being insured
        uint256 notional;           // coverage amount in USDC (6 decimals)
        uint256 spreadBps;          // annual premium in basis points e.g. 150
        uint256 collateral;         // seller's locked USDC
        uint256 maturity;           // unix timestamp of expiry
        uint256 openTimestamp;      // when position was opened
        uint256 lastPremiumPaid;    // timestamp of last premium payment
        PositionState state;
    }

    // ─────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────

    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    IERC20 public immutable usdc;
    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    ICDSToken public immutable cdsToken;

    address public settlementEngine;  // only this can execute payouts
    address public marginEngine;      // only this can update state to MARGIN_CALL
    address public premiumEngine;     // only this can update lastPremiumPaid

    uint256 public nextPositionId;

    // positionId => CDSPosition
    mapping(uint256 => CDSPosition) public positions;

    // seller address => total locked collateral across all positions
    mapping(address => uint256) public sellerCollateral;

    // ─────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────

    // minimum collateral = 120% of notional
    uint256 public constant MIN_COLLATERAL_BPS = 12000; // 120% in bps (base 10000)

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────

    event PositionOpened(
        uint256 indexed positionId,
        address indexed buyer,
        address indexed seller,
        address referenceEntity,
        uint256 notional,
        uint256 spreadBps,
        uint256 collateral,
        uint256 maturity
    );

    event CollateralToppedUp(
        uint256 indexed positionId,
        address indexed seller,
        uint256 amount,
        uint256 newTotal
    );

    event PositionExpired(
        uint256 indexed positionId,
        uint256 collateralReturned
    );

    event PayoutExecuted(
        uint256 indexed positionId,
        address indexed buyer,
        uint256 payout,
        uint256 surplusReturned
    );

    event PositionStateUpdated(
        uint256 indexed positionId,
        PositionState newState
    );

    event EnginesSet(
        address settlementEngine,
        address marginEngine,
        address premiumEngine
    );

    // ─────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientCollateral(uint256 required, uint256 provided);
    error PositionNotActive(uint256 positionId);
    error PositionAlreadyClosed(uint256 positionId);
    error NotSeller(uint256 positionId);
    error NotBuyer(uint256 positionId);
    error MaturityNotReached(uint256 maturity, uint256 current);
    error MaturityAlreadyPassed(uint256 maturity, uint256 current);
    error OnlyAuthorizedEngine();
    error OnlyMarginEngine();
    error OnlyPremiumEngine();
    error EnginesNotSet();
    error InvalidMaturity();

    // ─────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────

    modifier onlySettlementEngine() {
        _onlySettlementEngine();
        _;
    }

    function _onlySettlementEngine() internal view {
        if (msg.sender != settlementEngine && msg.sender != marginEngine) {
            revert OnlyAuthorizedEngine();
        }
    }

    modifier onlyMarginEngine() {
        _onlyMarginEngine();
        _;
    }

    function _onlyMarginEngine() internal view {
        if (msg.sender != marginEngine) revert OnlyMarginEngine();
    }

    modifier onlyPremiumEngine() {
        _onlyPremiumEngine();
        _;
    }

    function _onlyPremiumEngine() internal view {
        if (msg.sender != premiumEngine) revert OnlyPremiumEngine();
    }

    modifier enginesSet() {
        _enginesSet();
        _;
    }

    function _enginesSet() internal view {
        if (
            settlementEngine == address(0) ||
            marginEngine == address(0) ||
            premiumEngine == address(0)
        ) revert EnginesNotSet();
    }

    modifier positionActive(uint256 positionId) {
        _positionActive(positionId);
        _;
    }

    function _positionActive(uint256 positionId) internal view {
        if (positions[positionId].state != PositionState.ACTIVE &&
            positions[positionId].state != PositionState.MARGIN_CALL)
            revert PositionNotActive(positionId);
    }

    // ─────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────

    constructor(
        address _usdc,
        address _cdsToken,
        address _owner
    ) Ownable(_owner) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_cdsToken == address(0)) revert ZeroAddress();

        usdc = IERC20(_usdc);
        cdsToken = ICDSToken(_cdsToken);
        nextPositionId = 1;
    }

    // ─────────────────────────────────────────────
    //  ADMIN
    // ─────────────────────────────────────────────

    function setEngines(
        address _settlementEngine,
        address _marginEngine,
        address _premiumEngine
    ) external onlyOwner {
        if (_settlementEngine == address(0)) revert ZeroAddress();
        if (_marginEngine == address(0)) revert ZeroAddress();
        if (_premiumEngine == address(0)) revert ZeroAddress();

        settlementEngine = _settlementEngine;
        marginEngine = _marginEngine;
        premiumEngine = _premiumEngine;

        emit EnginesSet(_settlementEngine, _marginEngine, _premiumEngine);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ─────────────────────────────────────────────
    //  CORE — OPEN POSITION
    // ─────────────────────────────────────────────

    /**
     * @notice Seller locks collateral and opens a CDS position.
     *         Buyer and seller are passed explicitly.
     *
     * @param buyer            address receiving protection
     * @param seller           address providing collateral and selling protection
     * @param referenceEntity  protocol or wallet being insured
     * @param notional         coverage amount in USDC
     * @param spreadBps        annual premium in basis points
     * @param maturityDays     duration of the CDS in days
     */
    // forge-lint: disable-next-line(mixed-case-function)
    function openCDS(
        address buyer,
        address seller,
        address referenceEntity,
        uint256 notional,
        uint256 spreadBps,
        uint256 maturityDays
    )
        external
        nonReentrant
        whenNotPaused
        enginesSet
        returns (uint256 positionId)
    {
        // ── Checks ────────────────────────────────
        if (buyer == address(0)) revert ZeroAddress();
        if (seller == address(0)) revert ZeroAddress();
        if (referenceEntity == address(0)) revert ZeroAddress();
        if (notional == 0) revert ZeroAmount();
        if (spreadBps == 0) revert ZeroAmount();
        if (maturityDays == 0) revert InvalidMaturity();

        // minimum collateral = 120% of notional
        uint256 requiredCollateral = (notional * MIN_COLLATERAL_BPS) / 10000;

        uint256 sellerBalance = usdc.balanceOf(seller);
        if (sellerBalance < requiredCollateral)
            revert InsufficientCollateral(requiredCollateral, sellerBalance);

        // ── Effects ───────────────────────────────
        positionId = nextPositionId++;

        uint256 maturity = block.timestamp + (maturityDays * 1 days);

        positions[positionId] = CDSPosition({
            buyer: buyer,
            seller: seller,
            referenceEntity: referenceEntity,
            notional: notional,
            spreadBps: spreadBps,
            collateral: requiredCollateral,
            maturity: maturity,
            openTimestamp: block.timestamp,
            lastPremiumPaid: block.timestamp,
            state: PositionState.ACTIVE
        });

        sellerCollateral[seller] += requiredCollateral;

        // ── Interactions ──────────────────────────
        // pull collateral from seller
        usdc.safeTransferFrom(seller, address(this), requiredCollateral);

        // mint CDSToken to both buyer (side=0) and seller (side=1)
        cdsToken.mintPosition(buyer, seller, positionId);
        IPremiumEngine(premiumEngine).initializePosition(positionId);

        emit PositionOpened(
            positionId,
            buyer,
            seller,
            referenceEntity,
            notional,
            spreadBps,
            requiredCollateral,
            maturity
        );
    }

    // ─────────────────────────────────────────────
    //  COLLATERAL TOP-UP (during margin call)
    // ─────────────────────────────────────────────

    /**
     * @notice Seller tops up collateral after a margin call.
     */
    function topUpCollateral(
        uint256 positionId,
        uint256 amount
    )
        external
        nonReentrant
        whenNotPaused
        positionActive(positionId)
    {
        CDSPosition storage pos = positions[positionId];

        if (msg.sender != pos.seller) revert NotSeller(positionId);
        if (amount == 0) revert ZeroAmount();

        // ── Effects ───────────────────────────────
        pos.collateral += amount;
        sellerCollateral[msg.sender] += amount;

        // if margin call resolved, set back to ACTIVE
        if (pos.state == PositionState.MARGIN_CALL) {
            uint256 requiredCollateral = (pos.notional * MIN_COLLATERAL_BPS) / 10000;
            if (pos.collateral >= requiredCollateral) {
                pos.state = PositionState.ACTIVE;
                emit PositionStateUpdated(positionId, PositionState.ACTIVE);
            }
        }

        // ── Interactions ──────────────────────────
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit CollateralToppedUp(positionId, msg.sender, amount, pos.collateral);
    }

    // ─────────────────────────────────────────────
    //  EXPIRY — called by anyone after maturity
    // ─────────────────────────────────────────────

    /**
     * @notice Close an expired position and return collateral to seller.
     *         Anyone can trigger this after maturity to keep the protocol clean.
     */
    function expirePosition(uint256 positionId)
        external
        nonReentrant
        whenNotPaused
        positionActive(positionId)
    {
        CDSPosition storage pos = positions[positionId];

        if (block.timestamp < pos.maturity)
            revert MaturityNotReached(pos.maturity, block.timestamp);

        uint256 collateralToReturn = pos.collateral;
        address seller = pos.seller;

        // ── Effects ───────────────────────────────
        pos.state = PositionState.EXPIRED;
        pos.collateral = 0;
        sellerCollateral[seller] -= collateralToReturn;

        // ── Interactions ──────────────────────────
        usdc.safeTransfer(seller, collateralToReturn);
        cdsToken.burnPosition(positionId);

        emit PositionExpired(positionId, collateralToReturn);
    }

    // ─────────────────────────────────────────────
    //  SETTLEMENT PAYOUT — only SettlementEngine
    // ─────────────────────────────────────────────

    /**
     * @notice SettlementEngine calls this to pay buyer on credit event.
     *         Payout = notional * (1 - recoveryBps/10000)
     *         Surplus collateral returned to seller.
     *
     * @param positionId   the position being settled
     * @param recoveryBps  final recovery rate e.g. 4000 = 40%
     */
    function executePayout(
        uint256 positionId,
        uint256 recoveryBps
    )
        external
        nonReentrant
        onlySettlementEngine
        positionActive(positionId)
    {
        CDSPosition storage pos = positions[positionId];

        uint256 payout = (pos.notional * (10000 - recoveryBps)) / 10000;
        uint256 collateral = pos.collateral;
        address buyer = pos.buyer;
        address seller = pos.seller;

        // surplus = whatever is left after payout
        uint256 surplus = collateral > payout ? collateral - payout : 0;
        // if collateral < payout (shouldn't happen with 120% requirement)
        uint256 actualPayout = collateral > payout ? payout : collateral;

        // ── Effects ───────────────────────────────
        pos.state = PositionState.DEFAULTED;
        pos.collateral = 0;
        sellerCollateral[seller] -= collateral;

        // ── Interactions ──────────────────────────
        // pay buyer
        usdc.safeTransfer(buyer, actualPayout);

        // return surplus to seller
        if (surplus > 0) {
            usdc.safeTransfer(seller, surplus);
        }

        cdsToken.burnPosition(positionId);

        emit PayoutExecuted(positionId, buyer, actualPayout, surplus);
    }

    // ─────────────────────────────────────────────
    //  STATE UPDATES — called by MarginEngine
    // ─────────────────────────────────────────────

    function setMarginCall(uint256 positionId)
        external
        onlyMarginEngine
        positionActive(positionId)
    {
        positions[positionId].state = PositionState.MARGIN_CALL;
        emit PositionStateUpdated(positionId, PositionState.MARGIN_CALL);
    }

    function updateLastPremiumPaid(uint256 positionId, uint256 timestamp)
        external
        onlyPremiumEngine
        positionActive(positionId)
    {
        positions[positionId].lastPremiumPaid = timestamp;
    }

    // ─────────────────────────────────────────────
    //  VIEWS
    // ─────────────────────────────────────────────

    function getPosition(uint256 positionId)
        external
        view
        returns (CDSPosition memory)
    {
        return positions[positionId];
    }

    function getCollateralRatio(uint256 positionId)
        external
        view
        returns (uint256 ratioBps)
    {
        CDSPosition memory pos = positions[positionId];
        if (pos.notional == 0) return 0;
        return (pos.collateral * 10000) / pos.notional;
    }

    function isActive(uint256 positionId) external view returns (bool) {
        PositionState state = positions[positionId].state;
        return state == PositionState.ACTIVE || state == PositionState.MARGIN_CALL;
    }

    function getTotalPositions() external view returns (uint256) {
        return nextPositionId - 1;
    }
}