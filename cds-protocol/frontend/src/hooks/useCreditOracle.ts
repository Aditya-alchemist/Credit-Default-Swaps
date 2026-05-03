import {
  useReadContract,
  useWriteContract,
} from "wagmi";
import { SEPOLIA_ADDRESSES, CREDIT_ORACLE_ABI } from "../config/contracts";

// Read: Get credit data for an entity
export const useCreditData = (entity: string | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "getCreditData",
    args: entity ? [entity] : undefined,
    query: { enabled: !!entity },
  });
};

// Read: Get the full public oracle row, including spread and updatedAt.
export const useCreditEntityRow = (entity: string | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "creditByEntity",
    args: entity ? [entity] : undefined,
    query: { enabled: !!entity },
  });
};

// Read: Get credit score for an entity
export const useCreditScore = (entity: string | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "getCreditScore",
    args: entity ? [entity] : undefined,
    query: { enabled: !!entity },
  });
};

// Read: Get spread for an entity
export const useSpread = (entity: string | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "getSpread",
    args: entity ? [entity] : undefined,
    query: { enabled: !!entity },
  });
};

// Read: Check if data is stale
export const useIsStale = (entity: string | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "isStale",
    args: entity ? [entity] : undefined,
    query: { enabled: !!entity },
  });
};

// Read: Check if credit event is declared (default)
export const useIsCreditEventDeclared = (entity: string | undefined) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "isCreditEventDeclared",
    args: entity ? [entity] : undefined,
    query: { enabled: !!entity },
  });
};

// Write: Set credit data (admin only)
export const useSetCreditData = (params?: { entity: string; score: number | bigint; lambdaBps: number | bigint; recoveryBps: number | bigint }) => {
  const { writeContractAsync } = useWriteContract();

  return {
    write: {
      writeAsync: async () =>
        writeContractAsync({
          address: SEPOLIA_ADDRESSES.CreditOracle,
          abi: CREDIT_ORACLE_ABI,
          functionName: "setCreditData",
          args: params
            ? [params.entity, BigInt(params.score), BigInt(params.lambdaBps), BigInt(params.recoveryBps)]
            : undefined,
        }),
    },
  };
};

// Write: Mark entity as defaulted (admin only)
export const useMarkDefaulted = (entity?: string, isDefault?: boolean) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () =>
        writeContractAsync({
          address: SEPOLIA_ADDRESSES.CreditOracle,
          abi: CREDIT_ORACLE_ABI,
          functionName: "markDefaulted",
          args: entity !== undefined && isDefault !== undefined ? [entity, isDefault] : undefined,
        }),
    },
  };
};

// Write: Set updater role (admin only)
export const useSetUpdater = (account?: string, authorized?: boolean) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () =>
        writeContractAsync({
          address: SEPOLIA_ADDRESSES.CreditOracle,
          abi: CREDIT_ORACLE_ABI,
          functionName: "setUpdater",
          args: account && authorized !== undefined ? [account, authorized] : undefined,
        }),
    },
  };
};

// Write: Set authorized reporter (admin only)
export const useSetAuthorizedReporter = (reporter?: string, allowed?: boolean) => {
  const { writeContractAsync } = useWriteContract();
  return {
    write: {
      writeAsync: async () =>
        writeContractAsync({
          address: SEPOLIA_ADDRESSES.CreditOracle,
          abi: CREDIT_ORACLE_ABI,
          functionName: "setAuthorizedReporter",
          args: reporter && allowed !== undefined ? [reporter, allowed] : undefined,
        }),
    },
  };
};
