import {
  useReadContract,
  useWriteContract,
} from "wagmi";
import { SEPOLIA_ADDRESSES, LENDING_POOL_ABI } from "../config/contracts";

// Read: Get health factor for a loan
export const useHealthFactor = (loanId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getHealthFactor",
    args: loanId !== undefined ? [BigInt(loanId)] : undefined,
    query: { enabled: loanId !== undefined && loanId > 0 },
  });
};

// Read: Get total open positions in the lending pool
export const useTotalPositions = () => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getTotalPositions",
  });
};

// Read: Get pool liquidity and utilization
export const usePoolStats = () => {
  const totalSupplied = useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "totalSupplied",
  });

  const totalBorrowed = useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "totalBorrowed",
  });

  const availableLiquidity = useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getAvailableLiquidity",
  });

  const utilizationRate = useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getUtilizationRate",
  });

  const wethPriceUsdc = useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "wethPriceUsdc",
  });

  return { totalSupplied, totalBorrowed, availableLiquidity, utilizationRate, wethPriceUsdc };
};

// Read: Get loan details
export const useLoanPosition = (loanId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getLoanPosition",
    args: loanId !== undefined ? [BigInt(loanId)] : undefined,
    query: { enabled: loanId !== undefined && loanId > 0 },
  });
};

// Read: Get borrower loans
export const useBorrowerLoans = (borrower: string | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getBorrowerLoans",
    args: borrower ? [borrower] : undefined,
    query: { enabled: !!borrower },
  });
};

// Read: Get liquidation price
export const useLiquidationPrice = (loanId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getLiquidationPrice",
    args: loanId !== undefined ? [BigInt(loanId)] : undefined,
    query: { enabled: loanId !== undefined && loanId > 0 },
  });
};

// Write: Deposit USDC into lending pool
export const useDeposit = (amount?: number | bigint) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (amount === undefined) {
          throw new Error("Deposit amount is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.LendingPool,
          abi: LENDING_POOL_ABI,
          functionName: "deposit",
          args: [BigInt(amount)],
        });
      },
    },
  };
};

// Write: Withdraw USDC from lending pool
export const useWithdraw = (amount?: number | bigint) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (amount === undefined) {
          throw new Error("Withdrawal amount is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.LendingPool,
          abi: LENDING_POOL_ABI,
          functionName: "withdraw",
          args: [BigInt(amount)],
        });
      },
    },
  };
};

// Write: Borrow USDC against collateral
export const useBorrow = (collateralAmount?: number | bigint, borrowAmount?: number | bigint, duration?: number | bigint) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (collateralAmount === undefined || borrowAmount === undefined) {
          throw new Error("Collateral amount and borrow amount are required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.LendingPool,
          abi: LENDING_POOL_ABI,
          functionName: "borrow",
          args: [BigInt(collateralAmount), BigInt(borrowAmount), BigInt(duration ?? 0)],
        });
      },
    },
  };
};

// Write: Repay USDC loan
export const useRepay = (loanId?: number, amount?: number | bigint) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (loanId === undefined || amount === undefined) {
          throw new Error("Loan ID and amount are required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.LendingPool,
          abi: LENDING_POOL_ABI,
          functionName: "repay",
          args: [BigInt(loanId), BigInt(amount)],
        });
      },
    },
  };
};

// Write: Liquidate a borrower's loan
export const useLiquidate = (borrower?: string, loanId?: number) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (loanId === undefined) {
          throw new Error("Loan ID is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.LendingPool,
          abi: LENDING_POOL_ABI,
          functionName: "liquidate",
          args: [BigInt(loanId)],
        });
      },
    },
  };
};

// Write: Enable CDS protection on a supply position
export const useEnableCDSProtection = (supplyId?: number | bigint, seller?: string) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (supplyId === undefined || !seller) {
          throw new Error("Supply ID and seller address are required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.LendingPool,
          abi: LENDING_POOL_ABI,
          functionName: "enableCDSProtection",
          args: [BigInt(supplyId), seller as `0x${string}`],
        });
      },
    },
  };
};
