import { useReadContract, useWriteContract } from "wagmi";
import { SEPOLIA_ADDRESSES, MARGIN_ENGINE_ABI } from "../config/contracts";

// Read: Compute Mark-to-Market loss for position
export const useComputeMtM = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.MarginEngine,
    abi: MARGIN_ENGINE_ABI,
    functionName: "computeMtM",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Get current collateral ratio
export const useComputeCurrentRatio = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.MarginEngine,
    abi: MARGIN_ENGINE_ABI,
    functionName: "computeCurrentRatio",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Check if position is underwater
export const useIsUnderwater = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.MarginEngine,
    abi: MARGIN_ENGINE_ABI,
    functionName: "isUnderwater",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Get margin call deadline
export const useMarginCallDeadline = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.MarginEngine,
    abi: MARGIN_ENGINE_ABI,
    functionName: "getMarginCallDeadline",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Write: Check margins (trigger margin call if needed)
export const useCheckAndFlag = (positionId?: number) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (positionId === undefined) {
          throw new Error("Position ID is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.MarginEngine,
          abi: MARGIN_ENGINE_ABI,
          functionName: "checkAndFlag",
          args: [BigInt(positionId)],
        });
      },
    },
  };
};

// Write: Liquidate a position
export const useLiquidatePosition = (positionId?: number) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (positionId === undefined) {
          throw new Error("Position ID is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.MarginEngine,
          abi: MARGIN_ENGINE_ABI,
          functionName: "liquidatePosition",
          args: [BigInt(positionId)],
        });
      },
    },
  };
};
