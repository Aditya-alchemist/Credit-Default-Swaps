import { useReadContract, usePrepareContractWrite, useContractWrite } from "wagmi";
import { SEPOLIA_ADDRESSES, PREMIUM_ENGINE_ABI } from "../config/contracts";

// Read: Check if premium is missed for a position
export const useIsPremiumMissed = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.PremiumEngine,
    abi: PREMIUM_ENGINE_ABI,
    functionName: "isPremiumMissed",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined },
  });
};

// Read: Get next premium due date
export const useNextPremiumDue = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.PremiumEngine,
    abi: PREMIUM_ENGINE_ABI,
    functionName: "getNextPremiumDue",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined },
  });
};

// Write: Collect premium for a position
export const useCollectPremium = (positionId?: number) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.PremiumEngine,
    abi: PREMIUM_ENGINE_ABI,
    functionName: "collectPremium",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    enabled: positionId !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};
