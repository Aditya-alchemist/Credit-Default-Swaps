import {
  useReadContract,
  usePrepareContractWrite,
  useContractWrite,
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
    query: { enabled: positionId !== undefined },
  });
};

// Read: Check if position is active
export const useIsPositionActive = (positionId: number | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "isActive",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    query: { enabled: positionId !== undefined },
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
  referenceEntity: string;
  notional: number | bigint;
  spreadBps: number | bigint;
  maturity: number | bigint;
  collateral: number | bigint;
}) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "openCDS",
    args: params
      ? [
          params.buyer,
          params.referenceEntity,
          BigInt(params.notional),
          BigInt(params.spreadBps),
          BigInt(params.maturity),
          BigInt(params.collateral),
        ]
      : undefined,
    enabled: !!params,
  });

  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Top up collateral on existing position
export const useTopUpCollateral = (
  positionId?: number,
  additionalCollateral?: number | bigint
) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "topUpCollateral",
    args:
      positionId !== undefined && additionalCollateral !== undefined
        ? [BigInt(positionId), BigInt(additionalCollateral)]
        : undefined,
    enabled: positionId !== undefined && additionalCollateral !== undefined,
  });

  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Expire a position
export const useExpirePosition = (positionId?: number) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "expirePosition",
    args: positionId !== undefined ? [BigInt(positionId)] : undefined,
    enabled: positionId !== undefined,
  });

  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Pause vault
export const usePauseVault = () => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "pause",
    enabled: true,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Unpause vault
export const useUnpauseVault = () => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.CDSVault,
    abi: CDS_VAULT_ABI,
    functionName: "unpause",
    enabled: true,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};
