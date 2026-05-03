import {
  useReadContract,
  useWriteContract,
} from "wagmi";
import { SEPOLIA_ADDRESSES, CDS_VAULT_ABI } from "../config/contracts";

// Read: Get total positions count
export const useTotalPositions = () => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "getTotalPositions",
  });
};

// Read: Get specific CDS position
export const useCDSPosition = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "getPosition",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Check if position is active
export const useIsPositionActive = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "isActive",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Get a position's collateral ratio
export const useCollateralRatio = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "getCollateralRatio",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined && positionId > 0 },
  });
};

// Read: Get seller's total collateral locked
export const useSellerCollateral = (address: string | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "sellerCollateral",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
};

// Read: Get contract owner
export const useVaultOwner = () => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "owner",
  });
};

// Write: Open a new CDS position
export const useOpenCDS = (params?: {
  buyer: string;
  seller: string;
  referenceEntity: string;
  notional: number | bigint;
  spreadBps: number | bigint;
  maturityDays: number | bigint;
}) => {
  const { writeContractAsync } = useWriteContract();

  return {
    write: {
      writeAsync: async () => {
        if (!params) {
          throw new Error("All CDS parameters are required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.CDSVault,
          abi: CDS_VAULT_ABI,
          functionName: "openCDS",
          args: [
            params.buyer,
            params.seller,
            params.referenceEntity,
            BigInt(params.notional),
            BigInt(params.spreadBps),
            BigInt(params.maturityDays),
          ],
        });
      },
    },
  };
};

// Write: Top up collateral on existing position
export const useTopUpCollateral = (
  positionId?: number,
  additionalCollateral?: number | bigint
) => {
  const { writeContractAsync } = useWriteContract();

  return {
    write: {
      writeAsync: async () => {
        if (positionId === undefined || additionalCollateral === undefined) {
          throw new Error("Position ID and collateral amount are required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.CDSVault,
          abi: CDS_VAULT_ABI,
          functionName: "topUpCollateral",
          args: [BigInt(positionId), BigInt(additionalCollateral)],
        });
      },
    },
  };
};

// Write: Expire a position
export const useExpirePosition = (positionId?: number) => {
  const { writeContractAsync } = useWriteContract();

  return {
    write: {
      writeAsync: async () => {
        if (positionId === undefined) {
          throw new Error("Position ID is required");
        }
        return writeContractAsync({
          address: SEPOLIA_ADDRESSES.CDSVault,
          abi: CDS_VAULT_ABI,
          functionName: "expirePosition",
          args: [BigInt(positionId)],
        });
      },
    },
  };
};

// Write: Pause vault
export const usePauseVault = () => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () =>
        writeContractAsync({
          address: SEPOLIA_ADDRESSES.CDSVault,
          abi: CDS_VAULT_ABI,
          functionName: "pause",
        }),
    },
  };
};

// Write: Unpause vault
export const useUnpauseVault = () => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () =>
        writeContractAsync({
          address: SEPOLIA_ADDRESSES.CDSVault,
          abi: CDS_VAULT_ABI,
          functionName: "unpause",
        }),
    },
  };
};
