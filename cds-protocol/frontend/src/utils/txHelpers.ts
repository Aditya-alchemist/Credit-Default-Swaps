/**
 * Utility functions for transaction handling
 */

export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";

export const getExplorerUrl = (txHash: string, type: "tx" | "address" = "tx") => {
  if (type === "tx") {
    return `${SEPOLIA_EXPLORER}/tx/${txHash}`;
  }
  return `${SEPOLIA_EXPLORER}/address/${txHash}`;
};

export const formatGasEstimate = (gas: bigint | string | undefined) => {
  if (!gas) return undefined;
  const gasBigInt = typeof gas === "string" ? BigInt(gas) : gas;
  
  // Assuming ~30 gwei gas price for display
  const GAS_PRICE = BigInt("30000000000"); // 30 gwei
  const estimatedCost = gasBigInt * GAS_PRICE;
  
  // Convert wei to ETH
  const ETH = BigInt("1000000000000000000");
  const costInEth = Number(estimatedCost) / Number(ETH);
  
  return `~${gasBigInt.toLocaleString()} gas (~${costInEth.toFixed(4)} ETH)`;
};

export const extractErrorMessage = (error: any): string => {
  if (!error) return "Unknown error";
  
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.reason) return error.reason;
  if (error.shortMessage) return error.shortMessage;
  
  return JSON.stringify(error).slice(0, 100);
};
