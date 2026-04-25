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

## Notes

- Foundry config is at `contracts/foundry.toml`.
- Solidity source root is `contracts/src`.
