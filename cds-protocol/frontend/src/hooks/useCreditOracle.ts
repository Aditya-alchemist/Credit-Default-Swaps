import {
  useReadContract,
  usePrepareContractWrite,
  useContractWrite,
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
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "setCreditData",
    args: params
      ? [params.entity, BigInt(params.score), BigInt(params.lambdaBps), BigInt(params.recoveryBps)]
      : undefined,
    enabled: !!params,
  });

  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Mark entity as defaulted (admin only)
export const useMarkDefaulted = (entity?: string, isDefault?: boolean) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "markDefaulted",
    args: entity !== undefined && isDefault !== undefined ? [entity, isDefault] : undefined,
    enabled: entity !== undefined && isDefault !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};

// Write: Set updater role (admin only)
export const useSetUpdater = (account?: string, authorized?: boolean) => {
  const prepare = usePrepareContractWrite({
    address: SEPOLIA_ADDRESSES.CreditOracle,
    abi: CREDIT_ORACLE_ABI,
    functionName: "setUpdater",
    args: account && authorized !== undefined ? [account, authorized] : undefined,
    enabled: !!account && authorized !== undefined,
  });
  const write = useContractWrite(prepare.config);
  return { prepare, write };
};
