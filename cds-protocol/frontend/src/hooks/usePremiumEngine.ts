import { useReadContract, useWriteContract } from "wagmi";
import { SEPOLIA_ADDRESSES, PREMIUM_ENGINE_ABI } from "../config/contracts";

// Read: Check if premium is missed for a position
export const useIsPremiumMissed = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.PremiumEngine,
    abi: PREMIUM_ENGINE_ABI,
    functionName: "isPremiumMissed",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Get next premium due date
export const useNextPremiumDue = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.PremiumEngine,
    abi: PREMIUM_ENGINE_ABI,
    functionName: "getNextPremiumDue",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Get next premium amount
export const useNextPremiumAmount = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.PremiumEngine,
    abi: PREMIUM_ENGINE_ABI,
    functionName: "getNextPremiumAmount",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Get premium receiver
export const usePremiumReceiver = () => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.PremiumEngine,
    abi: PREMIUM_ENGINE_ABI,
    functionName: "premiumReceiver",
  });
};

// Write: Collect premium for a position
export const useCollectPremium = (positionId?: number) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (positionId === undefined) {
          throw new Error("Position ID is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.PremiumEngine,
          abi: PREMIUM_ENGINE_ABI,
          functionName: "collectPremium",
          args: [BigInt(positionId)],
        });
      },
    },
  };
};

// Write: Set premium receiver (admin only)
export const useSetPremiumReceiver = (newReceiver?: string) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () => {
        if (!newReceiver) {
          throw new Error("Receiver address is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.PremiumEngine,
          abi: PREMIUM_ENGINE_ABI,
          functionName: "setPremiumReceiver",
          args: [newReceiver],
        });
      },
    },
  };
};
