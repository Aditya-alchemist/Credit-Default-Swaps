# CDS Protocol

Monorepo scaffold for an on-chain Credit Default Swap protocol with:

- Foundry smart contracts in `contracts/`
- Python keeper bot in `bot/`
- FastAPI backend in `api/`
- React frontend in `frontend/`
- Research notebooks in `notebooks/`

## Foundry Quick Start

1. Open WSL and move to the contracts directory.
2. Install dependencies (when added) with `forge install`.
3. Build with `forge build`.
4. Run tests with `forge test`.

## Test Coverage

**Total: 92 tests (all passing)**

### Breakdown by Level:
- **Unit Tests** (17): SpreadMath (3), CDSVault (2), LendingPool (2), MarginEngine (2), SettlementEngine (2), CreditOracle (3)
- **Integration Tests** (5): FullCDSLifecycle (1), LendingCDSIntegration (2), FullProtocolTest (2)
- **Fuzz Tests** (5): FuzzSpreadMath (2), FuzzProtocolInvariants (3)
- **Full Protocol Test Suite** (68): FullProtocolTest covering 10 categories:
  - A. Deployment & Setup
  - B. CDSVault (open/top-up/expire)
  - C. PremiumEngine
  - D. MarginEngine
  - E. SettlementEngine
  - F. LendingPool
  - G. Lending + CDS integration
  - H. CreditOracle
  - I. Access Control
  - J. Edge Cases

Run full test suite: `forge test -vv`

## Notes

- Foundry config is at `contracts/foundry.toml`.
- Solidity source root is `contracts/src`.
