import {
  useReadContract,
  usePrepareContractWrite,
  useContractWrite,
} from "wagmi";
import { SEPOLIA_ADDRESSES, LENDING_POOL_ABI } from "../config/contracts";

// Read: Get health factor for a loan
export const useHealthFactor = (loanId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getHealthFactor",
    args: loanId !== undefined ? [BigInt(loanId)] : undefined,
    query: { enabled: loanId !== undefined },
  });
};

// Read: Get liquidation price
export const useLiquidationPrice = (loanId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getLiquidationPrice",
    args: loanId !== undefined ? [BigInt(loanId)] : undefined,
    query: { enabled: loanId !== undefined },
  });
};

// Write: Deposit USDC into lending pool
export const useDeposit = (amount?: number | bigint) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "deposit",
    args: amount !== undefined ? [BigInt(amount)] : undefined,
    enabled: amount !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Withdraw USDC from lending pool
export const useWithdraw = (amount?: number | bigint) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "withdraw",
    args: amount !== undefined ? [BigInt(amount)] : undefined,
    enabled: amount !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Borrow USDC against collateral
export const useBorrow = (collateral?: string, amount?: number | bigint, borrowAmount?: number | bigint) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "borrow",
    args:
      collateral && amount !== undefined && borrowAmount !== undefined
        ? [collateral, BigInt(amount), BigInt(borrowAmount)]
        : undefined,
    enabled: !!collateral && amount !== undefined && borrowAmount !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Repay USDC loan
export const useRepay = (loanId?: number, amount?: number | bigint) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "repay",
    args: loanId !== undefined && amount !== undefined ? [BigInt(loanId), BigInt(amount)] : undefined,
    enabled: loanId !== undefined && amount !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Liquidate a borrower's loan
export const useLiquidate = (borrower?: string, loanId?: number) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "liquidate",
    args: borrower && loanId !== undefined ? [borrower, BigInt(loanId)] : undefined,
    enabled: !!borrower && loanId !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Enable CDS protection on supply
export const useEnableCDSProtection = (enabledFlag?: boolean) => {
  // ABI for enabling CDS protection isn't explicit; this is a placeholder if ABI exists.
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "enableCDSProtection",
    args: enabledFlag !== undefined ? [enabledFlag] : undefined,
    enabled: enabledFlag !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};
