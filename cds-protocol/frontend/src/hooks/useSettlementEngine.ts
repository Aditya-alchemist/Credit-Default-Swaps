import { useReadContract, useWriteContract } from "wagmi";
import { SEPOLIA_ADDRESSES, SETTLEMENT_ENGINE_ABI } from "../config/contracts";

// Read: Preview payout amounts at settlement
export const usePreviewPayout = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.SettlementEngine,
    abi: SETTLEMENT_ENGINE_ABI,
    functionName: "previewPayout",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Write: Settle a single CDS position
export const useSettleCDS = (positionId?: number) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (positionId === undefined) {
          throw new Error("Position ID is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.SettlementEngine,
          abi: SETTLEMENT_ENGINE_ABI,
          functionName: "settleCDS",
          args: [BigInt(positionId)],
        });
      },
    },
  };
};

// Write: Batch settle multiple CDS positions
export const useBatchSettleCDS = (positionIds?: number[]) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (!positionIds || positionIds.length === 0) {
          throw new Error("At least one position ID is required");
        }
        const args = positionIds.map((p) => BigInt(p));
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.SettlementEngine,
          abi: SETTLEMENT_ENGINE_ABI,
          functionName: "batchSettleCDS",
          args: [args],
        });
      },
    },
  };
};
