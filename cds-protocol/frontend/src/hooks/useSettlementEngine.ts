import { useReadContract, usePrepareContractWrite, useContractWrite } from "wagmi";
import { SEPOLIA_ADDRESSES, SETTLEMENT_ENGINE_ABI } from "../config/contracts";

// Read: Preview payout amounts at settlement
export const usePreviewPayout = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.SettlementEngine,
    abi: SETTLEMENT_ENGINE_ABI,
    functionName: "previewPayout",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined },
  });
};

// Write: Settle a single CDS position
export const useSettleCDS = (positionId?: number) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.SettlementEngine,
    abi: SETTLEMENT_ENGINE_ABI,
    functionName: "settleCDS",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    enabled: positionId !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Batch settle multiple CDS positions
export const useBatchSettleCDS = (positionIds?: number[]) => {
  const args = positionIds ? positionIds.map((p) => BigInt(p)) : undefined;
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.SettlementEngine,
    abi: SETTLEMENT_ENGINE_ABI,
    functionName: "batchSettleCDS",
    args: args !== undefined ? [args] : undefined,
    enabled: args !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};
