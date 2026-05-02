// Sepolia deployment addresses from deploy/addresses.json
export const SEPOLIA_ADDRESSES = {
  USDC: "0x2B5f0c97B749ad711c83c71A355f428d0B6F9d72",
  WETH: "0xa7a46D5216Fae5ECec033D13249DC2655fBA167C",
  CDSToken: "0x44064cFEF1923B19F2DD868a0527a3Ef72Cc534c",
  VaultShareToken: "0xAE1a0a16DdC68eb3bc0D6C0C37c7c446A5BC33d5",
  LendingToken: "0x6f7bF747c95fB8D4209D04245A516d7256b2EfAb",
  CreditOracle: "0xBa48e8644e9C75C15aA0Ef8d8F51287a342fF140",
  ChainlinkAdapter: "0xBb58e0A75B5432333564Ba3810e67f6dec5b9bb1",
  CommitteeOracle: "0x0DD8e26a69A933ac3eb276F3764137DF13a06cF8",
  CDSVault: "0x2c08CD77239338fdaA88246CcC315ac90a29E365",
  PremiumEngine: "0xEB65C1AA43Fa28Fb0D0950D601c8B83a454DeB7f",
  MarginEngine: "0x60042fC84509b286f9f47A9F597495DFB8AE61d2",
  SettlementEngine: "0x04c6f7CfE9b6623594D72958225f9C2a8F1EBe5E",
  LendingPool: "0x472F8c4f7582e96Eaa29789166553d0281fDE285",
} as const;

// ERC20 ABI (minimal)
export const ERC20_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// CDS Vault ABI
export const CDS_VAULT_ABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalPositions",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "getPosition",
    outputs: [
      {
        components: [
          { internalType: "address", name: "buyer", type: "address" },
          { internalType: "address", name: "seller", type: "address" },
          {
            internalType: "address",
            name: "referenceEntity",
            type: "address",
          },
          { internalType: "uint256", name: "notional", type: "uint256" },
          { internalType: "uint256", name: "spreadBps", type: "uint256" },
          { internalType: "uint256", name: "collateral", type: "uint256" },
          { internalType: "uint256", name: "maturity", type: "uint256" },
          { internalType: "uint256", name: "openTimestamp", type: "uint256" },
          { internalType: "uint256", name: "lastPremiumPaid", type: "uint256" },
          { internalType: "uint8", name: "state", type: "uint8" },
        ],
        internalType: "struct ICDSVault.CDSPosition",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "isActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "buyer", type: "address" },
      { internalType: "address", name: "referenceEntity", type: "address" },
      { internalType: "uint256", name: "notional", type: "uint256" },
      { internalType: "uint256", name: "spreadBps", type: "uint256" },
      { internalType: "uint256", name: "maturity", type: "uint256" },
      { internalType: "uint256", name: "collateral", type: "uint256" },
    ],
    name: "openCDS",
    outputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "positionId", type: "uint256" },
      { internalType: "uint256", name: "additionalCollateral", type: "uint256" },
    ],
    name: "topUpCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "expirePosition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "sellerCollateral",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Credit Oracle ABI
export const CREDIT_ORACLE_ABI = [
  {
    inputs: [{ internalType: "address", name: "entity", type: "address" }],
    name: "getCreditData",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "score", type: "uint256" },
          { internalType: "uint256", name: "lambdaBps", type: "uint256" },
          { internalType: "uint256", name: "recoveryBps", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        internalType: "struct ICreditOracle.CreditData",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "entity", type: "address" }],
    name: "getSpread",
    outputs: [{ internalType: "uint256", name: "spreadBps", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "entity", type: "address" }],
    name: "isStale",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "entity", type: "address" }],
    name: "isCreditEventDeclared",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "entity", type: "address" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint256", name: "lambdaBps", type: "uint256" },
      { internalType: "uint256", name: "recoveryBps", type: "uint256" },
    ],
    name: "setCreditData",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "entity", type: "address" },
      { internalType: "bool", name: "isDefault", type: "bool" },
    ],
    name: "markDefaulted",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "bool", name: "authorized", type: "bool" },
    ],
    name: "setUpdater",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Premium Engine ABI
export const PREMIUM_ENGINE_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "collectPremium",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "isPremiumMissed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "getNextPremiumDue",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Margin Engine ABI
export const MARGIN_ENGINE_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "checkAndFlag",
    outputs: [{ internalType: "bool", name: "flagged", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "computeMtM",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "computeCurrentRatio",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "isUnderwater",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "getMarginCallDeadline",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "liquidatePosition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Settlement Engine ABI
export const SETTLEMENT_ENGINE_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "previewPayout",
    outputs: [
      { internalType: "uint256", name: "buyerPayout", type: "uint256" },
      { internalType: "uint256", name: "sellerSurplus", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "settleCDS",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[]", name: "positionIds", type: "uint256[]" },
    ],
    name: "batchSettleCDS",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Lending Pool ABI
export const LENDING_POOL_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "collateral", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "borrowAmount", type: "uint256" },
    ],
    name: "borrow",
    outputs: [{ internalType: "uint256", name: "loanId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "loanId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "repay",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "borrower", type: "address" },
      { internalType: "uint256", name: "loanId", type: "uint256" },
    ],
    name: "liquidate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "loanId", type: "uint256" },
    ],
    name: "getHealthFactor",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "loanId", type: "uint256" },
    ],
    name: "getLiquidationPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
