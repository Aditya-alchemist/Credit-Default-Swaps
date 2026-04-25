# On-Chain Credit Default Swap Protocol
## Complete Project Summary — What It Is, How to Build It, All Formulas, File Structure, and Flowcharts

---

## 1. What Is This Project?

A **Credit Default Swap (CDS) Protocol** is a standalone DeFi application that brings the $10+ trillion traditional CDS market fully on-chain.[cite:1][cite:42] It is a credit derivatives exchange where:

- **Protection Buyers** pay periodic premiums to insure against the default or collapse of a DeFi protocol, a borrower, or any reference entity
- **Protection Sellers (Underwriters)** lock USDC collateral, earn those premiums as yield, and absorb losses if a credit event fires
- **Borrowers** lock collateral and draw loans from a lending pool built into the same system
- **Lenders** supply capital, earn interest, and optionally buy CDS protection on their own supply position

The protocol solves the core failure of the 2008 AIG crisis: AIG wrote $440B in CDS protection with zero locked collateral, required a $182B bailout when defaults came.[cite:1] This protocol forces every protection seller to lock real on-chain collateral upfront — making every payout atomically guaranteed.

**Three products in one protocol, sharing the same contracts:**
1. CDS Market (credit derivatives)
2. Lending Market (borrow/supply)
3. AI Credit Oracle (continuous 30-min surveillance)

---

## 2. System Architecture — Four Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USER LAYER                                                             │
│  React dApp   |   MetaMask / WalletConnect   |   Greeks Dashboard      │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────────┐
│  ON-CHAIN CORE                                                          │
│  CDSVault.sol  |  PremiumEngine.sol  |  MarginEngine.sol               │
│  LendingPool.sol  |  SpreadMath.sol                                    │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────────┐
│  ON-CHAIN SETTLEMENT                                                    │
│  CreditOracle.sol  |  SettlementEngine.sol  |  CDSToken (ERC-1155)    │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────────┐
│  OFF-CHAIN AI + BOT LAYER                                               │
│  GNN + LSTM + XGBoost  |  Keeper Bot (30-min loop)  |  FastAPI         │
└─────────────────────────────────────────────────────────────────────────┘
```

| Layer | Key Components | Role |
|---|---|---|
| User Layer | React dApp, MetaMask, WalletConnect | CDS desk UI, lending dashboard, portfolio, Greeks |
| On-Chain Core | CDSVault, PremiumEngine, MarginEngine, LendingPool | Collateral, premium accrual, margin calls, loans |
| On-Chain Settlement | CreditOracle, SettlementEngine, CDSToken | Credit event declaration, atomic payout, ERC-1155 tokens |
| Off-Chain AI + Bot | GNN + LSTM + XGBoost, Keeper Bot | Credit score → hazard rate λ → oracle push every 30 min |

---

## 3. Core Concepts Explained

### What Is a CDS?

A CDS is a bilateral contract where the buyer pays a periodic spread (annual premium) and the seller promises to pay a large lump sum if a credit event occurs on a reference entity.[cite:35][cite:42] The buyer is buying insurance. The seller is the insurer. The reference entity is the thing being insured against.

### What Is a Credit Event?

In this protocol, a credit event is any of these on-chain verifiable conditions:[cite:47]
- TVL collapse > 60% over 48 hours
- Collateral ratio below critical floor for > 6 consecutive hours
- Oracle price deviation > 30%
- Borrow utilization > 99% (bank run signal)
- Governance attack (rapid multisig change + large withdrawal)
- Smart contract exploit (abnormal balance drain)
- Stablecoin depeg > 15% sustained
- Bridge hack exposure (cross-chain TVL anomaly)

### Why Lock Collateral?

The seller (not the buyer) locks collateral. The buyer only pays premiums. The seller locks collateral to prove the payout can be made atomically if a credit event fires — without trust, without counterparty risk. This is what AIG failed to do.[cite:1]

---

## 4. CDS Lifecycle — Complete Flowchart

```
                         ┌──────────────────────┐
                         │   MARKET CREATION     │
                         │  (Admin / Governance) │
                         │  Define reference     │
                         │  entity, tenor,       │
                         │  recovery rate        │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┴──────────────────────┐
              │                                            │
    ┌─────────▼──────────┐                    ┌────────────▼────────────┐
    │  PROTECTION SELLER │                    │  PROTECTION BUYER       │
    │  Locks USDC in     │                    │  Calls openProtection() │
    │  CDSVault at 120%+ │                    │  Selects notional,      │
    │  MtM collateral    │                    │  tenor, spread          │
    │  Receives lpToken  │                    │  Gets CDSToken minted   │
    └─────────┬──────────┘                    └────────────┬────────────┘
              │                                            │
              └─────────────────────┬──────────────────────┘
                                    │
                         ┌──────────▼───────────┐
                         │   ACTIVE POSITION     │
                         │   PremiumEngine       │
                         │   accrues quarterly   │
                         │   premium ACT/360     │
                         │   Keeper bot monitors │
                         │   every 30 minutes    │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┴──────────────────────┐
              │                                            │
    ┌─────────▼──────────┐                    ┌────────────▼────────────┐
    │  MARGIN CHECK       │                    │  CREDIT EVENT CHECK     │
    │  MarginEngine       │                    │  AI model computes      │
    │  collateral < 120%  │                    │  credit score → λ       │
    │  of MtM?            │                    │  8 triggers checked     │
    └─────────┬──────────┘                    └────────────┬────────────┘
              │                                            │
    ┌─────────▼──────────┐                    ┌────────────▼────────────┐
    │  MARGIN CALL        │                    │  EVENT DECLARED         │
    │  4h top-up window   │                    │  declareEvent() called  │
    │  If not topped up → │                    │  Market frozen          │
    │  liquidate position │                    │  Settlement begins      │
    └─────────┬──────────┘                    └────────────┬────────────┘
              │                                            │
              │                              ┌─────────────▼────────────┐
              │                              │  SETTLEMENT (ATOMIC)     │
              │                              │  Payout = N × (1−R)      │
              │                              │  → Buyer from vault      │
              │                              │  Surplus → back to seller│
              │                              │  CDSToken burned         │
              │                              └──────────────────────────┘
              │
    ┌─────────▼──────────┐
    │  MATURITY (no event)│
    │  Premiums kept by   │
    │  seller vault       │
    │  Collateral returned│
    │  CDSToken burned    │
    └────────────────────┘
```

---

## 5. Lending Module Flowchart

```
                    ┌──────────────────────────────────────┐
                    │           LENDING POOL                │
                    └────────┬───────────────┬─────────────┘
                             │               │
             ┌───────────────▼──┐       ┌────▼───────────────────┐
             │     LENDER        │       │      BORROWER           │
             │  deposit USDC /  │       │  Lock WETH/WBTC/USDC   │
             │  WETH / DAI      │       │  in CDSVault            │
             │  receive lToken  │       │  Draw USDC/DAI loan     │
             │  earn yield APY  │       │  PremiumEngine accrues  │
             │                  │       │  interest ACT/360       │
             │  Optional:       │       │                         │
             │  CDS Protection  │       │  MarginEngine monitors  │
             │  toggle ON →     │       │  Health Factor live     │
             │  inner CDS opened│       │                         │
             │  premium deducted│       │  HF < 1.0 →             │
             │  from APY        │       │  Liquidation triggered  │
             └───────┬──────────┘       └────┬────────────────────┘
                     │                       │
                     │                       │
             ┌───────▼───────────────────────▼────────────┐
             │            SETTLEMENT ENGINE                │
             │   CDS event on pool → pays lenders         │
             │   Borrower default → liquidates collateral  │
             │   Atomic DVP in single transaction          │
             └────────────────────────────────────────────┘
```

---

## 6. AI Keeper Bot Flowchart (30-Minute Loop)

```
  ┌─────────────────────────────────────────────────┐
  │              KEEPER BOT LOOP (every 30 min)      │
  └────────────────────┬────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │  feature_pipeline.py    │
          │  Ingest 24 features:    │
          │  TVL delta, collatRatio,│
          │  borrow util, vol, NLP, │
          │  whale flows, audits... │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  credit_model.py        │
          │  GNN → 128-dim embed    │
          │  LSTM → 64-dim state    │
          │  XGBoost → score 0-10K  │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  hazard_mapper.py       │
          │  λ = −ln(score/10000)/T │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  oracle_updater.py      │
          │  CreditOracle           │
          │  .updateScore(entity,   │
          │   score, λ) on-chain    │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  event_detector.py      │
          │  Check 8 triggers       │
          │  TVL, util, depeg, hack,│
          │  governance, bridge...  │
          └────────┬────────────────┘
                   │
       ┌───────────┴───────────┐
       │ trigger fired?        │
    NO │                    YES│
       │           ┌───────────▼────────────┐
       │           │  bot.py                │
       │           │  declareEvent(marketId,│
       │           │  evidenceHash)         │
       │           └───────────┬────────────┘
       │                       │
       │           ┌───────────▼────────────┐
       │           │  SettlementEngine      │
       │           │  triggers payout       │
       │           └────────────────────────┘
       │
  ┌────▼────────────────────┐
  │  margin_checker.py      │
  │  Scan all active CDS +  │
  │  loan positions         │
  │  Issue margin calls if  │
  │  collateral < 120% MtM  │
  └────────────┬────────────┘
               │
  ┌────────────▼────────────┐
  │  Log results            │
  │  Sleep 30 minutes       │
  │  Repeat                 │
  └─────────────────────────┘
```

---

## 7. All Formulas Used

### CDS Pricing Formulas (Jarrow-Turnbull Model)

**Survival Probability** — probability the reference entity survives to time T:

$$Q(\tau > T) = e^{-\lambda \times T}$$

**Hazard Rate from AI Credit Score** — converts the model's 0–10000 score into a continuous default intensity:

$$\lambda = \frac{-\ln(\text{creditScore} / 10000)}{T}$$

**Fair CDS Spread** — the annual premium (in bps) that makes the expected protection leg equal the expected premium leg:

$$S = \lambda \times (1 - R) \quad \Rightarrow \quad S_{bps} = S \times 10000$$

**PV01 (Risky Dollar Value of 1 Basis Point)** — dollar sensitivity of the contract to a 1bp spread move:

$$\text{PV01} = \sum_{i} \Delta t_i \cdot e^{-r \cdot t_i} \cdot e^{-\lambda \cdot t_i}$$

**Mark-to-Market (MtM)** — current value of an existing CDS position:

$$\text{MtM} = (S_{\text{current}} - S_{\text{entry}}) \times \text{PV01}$$

**Cash Payout on Credit Event** — amount seller pays buyer upon settlement:

$$\text{Payout} = \text{notional} \times (1 - R_{\text{final}})$$

**Approximate Fair Spread (quick estimate):**

$$\lambda \approx \frac{s}{1 - R}$$

### Premium & Interest Accrual (ACT/360 — ISDA Standard)

**Quarterly CDS Premium (PremiumEngine.sol):**

$$P = \frac{\text{notional} \times S_{bps} \times \text{days}}{10000 \times 360}$$

**Loan Interest Accrual (LendingPool — same engine):**

$$I = \frac{\text{notional} \times \text{APR} \times \text{days}}{365}$$

### Margin & Lending Formulas (MarginEngine.sol)

**Vault Share Price (Underwriter LP Token):**

$$\text{sharePrice} = \frac{\text{totalAssets}}{\text{totalSupply}}$$

**Shares on Deposit:**

$$\text{shares} = \frac{\text{deposit} \times \text{totalSupply}}{\text{totalAssets}}$$

**Health Factor (Borrower Position):**

$$HF = \frac{\text{collateralUSD} \times \text{collateralFactor}}{\text{totalBorrowed}}$$

**Liquidation Price for Collateral Asset:**

$$P_{\text{liq}} = \frac{\text{borrowed}}{\text{collateralQty} \times \text{collateralFactor}}$$

**Margin Call Threshold:**

$$\text{collateral} < 1.20 \times \text{MtM} \Rightarrow \text{margin call issued}$$

### Worked Numerical Example

- Reference entity: Compound Finance
- Notional: $1,000,000 USDC
- AI credit score: 8,200 / 10000
- T = 1 year, R = 0.40 (40% recovery), r = 5%

Computations:

$$\lambda = \frac{-\ln(8200/10000)}{1} = \frac{-\ln(0.82)}{1} \approx 0.0198$$

$$S_{bps} = 0.0198 \times (1 - 0.40) \times 10000 = 118.8 \approx 119 \text{ bps}$$

$$P_{\text{quarterly}} = \frac{1{,}000{,}000 \times 119 \times 90}{10000 \times 360} = \$2{,}975$$

If credit event fires at day 180:

$$\text{Payout} = 1{,}000{,}000 \times (1 - 0.40) = \$600{,}000$$

Seller gets surplus collateral back: $120,000

---

## 8. Token System — All 5 Tokens

| Token | Standard | Name | Purpose |
|---|---|---|---|
| Payment Token | ERC-20 | USDC / protocol stable | All premiums, interest, collateral, payouts |
| Position Token | ERC-1155 | CDSToken | Dual-sided: buyer-side and seller-side encoded in token ID |
| Vault LP Token | ERC-20 (per vault) | pvUSDC-ENTITY | Underwriter vault share — earns premiums, absorbs losses |
| Lending Supply Token | ERC-20 (per asset) | lUSDC / lWETH / lDAI | Lender supply token — interest-bearing, redeemable |
| Governance Token | ERC-20 | CDSGOV | V2/V3 — controls parameters, oracle whitelist, fee split |

---

## 9. Smart Contracts — All 8 Contracts

### CDSVault.sol

The central collateral and position manager. Stores `CDSPosition` struct for every active CDS. Also holds borrower collateral for the lending module.

```solidity
struct CDSPosition {
    address buyer;
    address seller;
    address referenceEntity;
    uint256 notional;         // in USDC (6 decimals)
    uint256 spread_bps;       // e.g. 119
    uint256 collateral;       // seller's locked USDC
    uint256 maturity;         // unix timestamp
    uint256 openTimestamp;
    PositionState state;      // ACTIVE | MARGIN_CALL | DEFAULTED | EXPIRED
}
```

Key functions: `openCDS()`, `closePosition()`, `topUpCollateral()`, `lockBorrowerCollateral()`, `releaseBorrowerCollateral()`

Security: CEI pattern, ReentrancyGuard, Pausable, onlySettlementEngine modifier on payout execution

---

### PremiumEngine.sol

Handles ACT/360 premium accrual for CDS and ACT/365 interest accrual for loans. Single engine, two use cases.

Key functions: `accruePremium()`, `collectPremium()`, `accrueInterest()`, `collectInterest()`, `checkGracePeriod()`

---

### CreditOracle.sol

Stores `creditScore` (0–10000) and `hazardRate` (λ in 8 decimal fixed-point) per reference entity. Only authorized keeper wallet can push updates. Staleness safety halt at 3600 seconds — if data not refreshed, new position openings pause automatically.

Key functions: `updateScore(address entity, uint256 score, uint256 hazardRate)`, `declareEvent(uint256 marketId, bytes32 evidenceHash)`, `getHazardRate(address entity)`, `isStale(address entity)`

---

### MarginEngine.sol

Monitors collateral ratios for CDS sellers and health factors for borrowers. Issues margin calls and executes liquidations.

Key functions: `checkMargin(uint256 positionId)`, `issueMarginCall(uint256 positionId)`, `liquidatePosition(uint256 positionId)`, `computeMtM(uint256 positionId)`, `computeHealthFactor(address borrower)`

---

### SettlementEngine.sol

Executes atomic delivery-vs-payment. On credit event: transfers payout from CDSVault to buyer in one transaction, returns surplus to seller, burns CDSToken. On loan default: liquidates borrower collateral, repays lenders.

Key functions: `settleCDS(uint256 positionId)`, `returnSurplus(uint256 positionId)`, `liquidateBorrower(address borrower)`, `computePayout(uint256 notional, uint256 recoveryBps)`

---

### CDSToken.sol (ERC-1155)

Dual-sided position tokens. Token ID encodes position ID, reference entity, tenor, and side (0 = buyer, 1 = seller). Both buyer and seller hold tokens. Burned on close, expiry, or settlement.

Key functions: `mintPosition(address buyer, address seller, PositionParams calldata params)`, `burnPosition(uint256 tokenId)`, `uri(uint256 tokenId)` — on-chain SVG metadata

---

### SpreadMath.sol

Pure math library. All CDS pricing formulas in fixed-point arithmetic (8 decimal precision, no floats). Imported by CDSVault, MarginEngine, PremiumEngine.

Implements: survival probability, fair spread, PV01, MtM, payout, hazard rate from score

---

### LendingPool.sol

Manages lender deposits (mint lTokens), borrower loans (lock collateral → draw funds), interest accrual (delegates to PremiumEngine), CDS protection toggling (calls CDSVault to open inner CDS), and liquidation (delegates to SettlementEngine).

Key functions: `deposit(address asset, uint256 amount)`, `withdraw(uint256 lTokenAmount)`, `borrow(address collateral, uint256 collateralAmt, uint256 loanAmt, uint256 duration)`, `repay(uint256 loanId)`, `enableCDSProtection(uint256 depositId)`, `computeNetAPY(uint256 depositId)`

---

## 10. AI Credit Model — Full Pipeline

### Feature Set (24 Features)

| Category | Features |
|---|---|
| On-chain health | TVL delta, collateral ratio, borrow utilization, liquidation volume, oracle deviation, whale flows |
| Market signals | Realized volatility, implied vol, governance sell pressure, DEX liquidity, BTC correlation |
| Governance & social | Proposal pass rate, voter turnout, multisig changes, NLP sentiment score, GitHub commit velocity, audit severity score |
| Historical events | Past exploits (binary), protocol age, prior margin calls count, depeg events, bridge hack exposure flag |

### Pipeline Architecture

```
Raw Features (24-dim)
        │
        ▼
┌──────────────────────────┐
│  GNN Layer               │
│  Protocol relationship   │
│  graph encoder           │
│  Output: 128-dim embed   │
└────────────┬─────────────┘
             │
        ▼
┌──────────────────────────┐
│  LSTM (2 layers)         │
│  90-day time series:     │
│  TVL, borrow, liquidation│
│  Output: 64-dim state    │
└────────────┬─────────────┘
             │
        ▼
┌──────────────────────────┐
│  XGBoost (500 trees)     │
│  Input: 128 + 64 + 24    │
│         = 216 dimensions │
│  Output: score 0–10000   │
└────────────┬─────────────┘
             │
        ▼
    λ = −ln(score/10000) / T
             │
        ▼
  CreditOracle.updateScore()
```

### Backtest Targets

The model must spike λ to 5-sigma above baseline at least 48 hours before each event:[cite:1]

| Event | Date | Protocol |
|---|---|---|
| LUNA/UST collapse | May 2022 | Terra |
| 3AC contagion | June 2022 | Multiple |
| FTX collapse | November 2022 | FTX |
| Euler Finance hack | March 2023 | Euler |
| Curve exploit | July 2023 | Curve Finance |

---

## 11. Complete File Structure

```
cds-protocol/
│
├── contracts/                          ← Solidity smart contracts
│   ├── core/
│   │   ├── CDSVault.sol                ← Position manager, collateral vault
│   │   ├── PremiumEngine.sol           ← ACT/360 premium + interest accrual
│   │   ├── MarginEngine.sol            ← MtM, margin calls, HF, liquidation
│   │   ├── SettlementEngine.sol        ← Atomic DVP payout on credit event
│   │   └── LendingPool.sol             ← Lend, borrow, CDS protection on supply
│   │
│   ├── oracle/
│   │   ├── CreditOracle.sol            ← Stores creditScore + λ per entity
│   │   ├── ChainlinkAdapter.sol        ← Wraps AggregatorV3Interface
│   │   └── CommitteeOracle.sol         ← Multisig fallback for complex events
│   │
│   ├── tokens/
│   │   ├── CDSToken.sol                ← ERC-1155 dual-sided position token
│   │   ├── VaultShareToken.sol         ← ERC-20 LP token per protection vault
│   │   └── LendingToken.sol            ← ERC-20 lToken per asset (lUSDC etc.)
│   │
│   ├── libraries/
│   │   └── SpreadMath.sol              ← All fixed-point Jarrow-Turnbull math
│   │
│   ├── interfaces/
│   │   ├── ICDSVault.sol
│   │   ├── ICreditOracle.sol
│   │   ├── ILendingPool.sol
│   │   └── ISettlementEngine.sol
│   │
│   └── governance/
│       ├── CDSGovernor.sol             ← V2/V3 governance with 48h timelock
│       └── CDSGovToken.sol             ← ERC-20 governance token
│
├── test/                               ← Foundry test suite
│   ├── unit/
│   │   ├── CDSVault.t.sol
│   │   ├── PremiumEngine.t.sol
│   │   ├── MarginEngine.t.sol
│   │   ├── SettlementEngine.t.sol
│   │   ├── SpreadMath.t.sol
│   │   └── LendingPool.t.sol
│   ├── integration/
│   │   ├── FullCDSLifecycle.t.sol      ← Open → premiums → credit event → settle
│   │   └── LendingCDSIntegration.t.sol ← Lend + borrow + CDS protection
│   └── fuzz/
│       ├── FuzzSpreadMath.t.sol
│       └── FuzzMarginEngine.t.sol
│
├── script/                             ← Foundry deployment scripts
│   ├── Deploy.s.sol                    ← Full protocol deploy
│   ├── DeployTestnet.s.sol             ← Sepolia deploy
│   └── CreateMarket.s.sol             ← Create first CDS market
│
├── bot/                                ← Off-chain keeper bot (Python)
│   ├── bot.py                          ← Main loop, orchestrator
│   ├── feature_pipeline.py             ← Ingest 24 features from RPC + APIs
│   ├── credit_model.py                 ← GNN + LSTM + XGBoost inference
│   ├── hazard_mapper.py                ← Score → λ conversion
│   ├── oracle_updater.py               ← Push to CreditOracle on-chain
│   ├── event_detector.py               ← Check 8 credit event triggers
│   ├── margin_checker.py               ← Scan all positions for margin calls
│   ├── config.py                       ← RPC URLs, contract addresses, keys
│   └── models/
│       ├── gnn_model.py                ← PyTorch GNN definition
│       ├── lstm_model.py               ← PyTorch LSTM definition
│       ├── xgboost_model.py            ← XGBoost wrapper
│       └── train.py                    ← Training pipeline on historical data
│
├── api/                                ← FastAPI backend
│   ├── main.py                         ← FastAPI app entry point
│   └── routes/
│       ├── spread.py                   ← GET /quote?entity=&notional=&tenor=
│       ├── health.py                   ← GET /health/{entity}
│       └── greeks.py                   ← GET /greeks/{positionId}
│
├── frontend/                           ← React dApp
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CDSDesk.jsx             ← Open/close CDS positions
│   │   │   ├── Lending.jsx             ← Supply/borrow with CDS protection
│   │   │   ├── Portfolio.jsx           ← All positions, net PnL
│   │   │   └── Oracle.jsx              ← Live scores, λ charts, event log
│   │   ├── components/
│   │   │   ├── SpreadQuote.jsx         ← Real-time spread display
│   │   │   ├── MtMChart.jsx            ← Mark-to-market over time
│   │   │   ├── HealthFactor.jsx        ← Borrower health gauge
│   │   │   ├── GreeksDashboard.jsx     ← PV01, CS01, delta
│   │   │   └── CreditScoreCard.jsx     ← AI score + λ per entity
│   │   ├── hooks/
│   │   │   ├── useCDSVault.js          ← Contract interaction hooks
│   │   │   ├── useLendingPool.js
│   │   │   └── useCreditOracle.js
│   │   └── utils/
│   │       ├── spreadMath.js           ← JS mirror of SpreadMath.sol formulas
│   │       └── formatting.js
│   └── package.json
│
├── notebooks/                          ← Research and backtesting
│   ├── 01_cds_pricing_intro.ipynb      ← Jarrow-Turnbull model walkthrough
│   ├── 02_hazard_bootstrap.ipynb       ← Credit curve bootstrapping
│   ├── 03_ai_model_training.ipynb      ← GNN + LSTM + XGBoost training
│   ├── 04_backtest_luna.ipynb          ← LUNA collapse signal test
│   └── 05_scenario_analysis.ipynb      ← Spread stress testing
│
├── foundry.toml                        ← Foundry config
├── .env.example                        ← RPC URL, private key, API keys
└── README.md
```

---

## 12. Build Roadmap — 6 Months

| Phase | Timeline | What to Build |
|---|---|---|
| Phase 1 | Month 1 | CDSVault + PremiumEngine + SpreadMath. Full unit tests. Sepolia deploy. Open/close/settle basic flow working. |
| Phase 2 | Month 2–3 | MarginEngine + SettlementEngine + CDSToken (ERC-1155) + LendingPool. Keeper bot v1 (rule-based, no AI yet). |
| Phase 3 | Month 4–5 | Full AI pipeline: GNN + LSTM training on historical DeFi data. XGBoost ensemble. 30-min keeper loop live on testnet. Backtest on LUNA/FTX/Euler. |
| Phase 4 | Month 6 | React dApp with all views. Fuzz + invariant tests in Foundry. Audit prep. Research paper draft. |

---

## 13. Production Upgrade Path

### Critical Before Mainnet
- Replace manual keeper with **Chainlink Functions** — decentralized oracle, removes single-keeper trust
- Formal verification of `SpreadMath.sol` — all fixed-point math proved correct using Certora or Halmos
- Professional security audit (minimum Tier 1 firm)

### High Priority Post-Launch
- **EigenLayer AVS** — decentralized keeper network, economically secured
- **Chainlink CCIP** — cross-chain CDS (buy protection on Ethereum, collateral on Arbitrum)
- Multi-entity support: Aave, Compound, Uniswap, Curve, MakerDAO, GMX
- Governance with 48-hour timelock

### Future Extensions
- **CDS Index** — on-chain CDX equivalent (basket of 5–20 reference entities)
- **CDS Swaptions** — options on entering a CDS at a fixed spread
- **RWA CDS** — protection on tokenized real-world bonds and loans via ERC-1400[cite:43]
- Academic publication targeting *Journal of Financial Economics* or *Financial Cryptography*

---

## 14. Technology Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity ^0.8.24, Foundry |
| Token standards | ERC-1155 (positions), ERC-20 (LP + lending + governance) |
| Math | SpreadMath.sol — fixed-point 8dp, Jarrow-Turnbull |
| Oracle | CreditOracle.sol + Chainlink AggregatorV3 → Chainlink Functions (V2) |
| Testing | Foundry forge + fuzz tests + invariant tests |
| Deployment | Sepolia testnet → Arbitrum / Base mainnet |
| AI model | Python: PyTorch (GNN + LSTM), XGBoost, scikit-learn |
| Keeper bot | Python: web3.py, asyncio, Alchemy RPC |
| Backend API | FastAPI — spread quotes, health scores, Greeks |
| Frontend | React, wagmi/viem, ethers.js, Recharts, TailwindCSS |
| Data indexing | The Graph subgraph or direct RPC polling |

---

## 15. What Success Looks Like

At end of Phase 4, these 8 things must all work end-to-end:

1. Buyer opens $1M CDS on Compound Finance — CDSToken minted, quarterly premiums streaming
2. Underwriter deposits $600K USDC — vault LP token minted, accruing premium yield
3. Lender supplies $100K USDC with CDS protection enabled — lToken minted, inner CDS auto-opened
4. Borrower locks $150K WETH, draws $100K USDC loan — health factor live at 1.5, liquidation price visible
5. Keeper bot detects 65% TVL drop — AI score spikes, λ hits 5-sigma, `declareEvent()` auto-called
6. SettlementEngine atomically pays buyer $600K payout, returns $120K surplus to seller — one transaction
7. Lender's CDS protection fires — their $100K covered by the inner CDS settlement
8. All events emitted on-chain, indexed by The Graph, visible on Oracle dashboard

Zero human intermediation. Zero counterparty trust. Complete on-chain transparency.

