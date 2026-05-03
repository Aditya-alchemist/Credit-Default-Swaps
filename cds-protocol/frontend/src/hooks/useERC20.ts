import {
  useReadContract,
  useAccount,
  useWriteContract,
} from "wagmi";
import { parseUnits } from "viem";

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

// Read: Get allowance
export const useAllowance = (
  tokenAddress: string | undefined,
  owner: string | undefined,
  spender: string | undefined
) => {
  return useReadContract({
    address: tokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: owner && spender ? [owner as `0x${string}`, spender as `0x${string}`] : undefined,
    query: { enabled: !!tokenAddress && !!owner && !!spender },
  });
};

// Read: Get balance
export const useTokenBalance = (
  tokenAddress: string | undefined,
  account: string | undefined
) => {
  return useReadContract({
    address: tokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: account ? [account as `0x${string}`] : undefined,
    query: { enabled: !!tokenAddress && !!account },
  });
};

// Read: Get decimals
export const useTokenDecimals = (tokenAddress: string | undefined) => {
  return useReadContract({
    address: tokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!tokenAddress },
  });
};

// Write: Approve token spending
export const useApproveToken = (params?: {
  tokenAddress: string;
  spender: string;
  amount: number | bigint | string;
}) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () =>
        writeContractAsync({
          address: params?.tokenAddress ? (params.tokenAddress as `0x${string}`) : undefined,
          abi: ERC20_ABI,
          functionName: "approve",
          args: params
            ? [
                params.spender as `0x${string}`,
                typeof params.amount === "string"
                  ? BigInt(params.amount)
                  : BigInt(params.amount),
              ]
            : undefined,
        }),
    },
  };
};

// Write: Mint mock ERC20 tokens to a recipient.
export const useMintToken = (params?: {
  tokenAddress: string;
  to: string;
  amount: number | bigint | string;
}) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () =>
        writeContractAsync({
          address: params?.tokenAddress ? (params.tokenAddress as `0x${string}`) : undefined,
          abi: ERC20_ABI,
          functionName: "mint",
          args: params
            ? [
                params.to as `0x${string}`,
                typeof params.amount === "string"
                  ? BigInt(params.amount)
                  : BigInt(params.amount),
              ]
            : undefined,
        }),
    },
  };
};

// Helper: Check if approval is needed
export const useApprovalNeeded = (
  tokenAddress: string | undefined,
  spender: string | undefined,
  requiredAmount: number | bigint | undefined
) => {
  const { address } = useAccount();
  const allowance = useAllowance(tokenAddress, address, spender);

  const isNeeded =
    allowance.data !== undefined &&
    requiredAmount !== undefined &&
    BigInt(allowance.data || 0) < BigInt(requiredAmount);

  return {
    isNeeded,
    currentAllowance: allowance.data,
    isLoading: allowance.isLoading,
  };
};
