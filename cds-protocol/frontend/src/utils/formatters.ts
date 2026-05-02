// Format numbers with commas and decimals
export const formatNumber = (num: number | string, decimals = 2): string => {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Format USDC/token amounts (6 decimals)
export const formatUsdc = (weiAmount: bigint | string): string => {
  const amount = typeof weiAmount === "bigint" ? Number(weiAmount) : Number(weiAmount);
  return formatNumber(amount / 1e6, 2);
};

// Format WETH amounts (18 decimals)
export const formatWeth = (weiAmount: bigint | string): string => {
  const amount = typeof weiAmount === "bigint" ? Number(weiAmount) : Number(weiAmount);
  return formatNumber(amount / 1e18, 4);
};

// Format basis points (1 bps = 0.01%)
export const formatBps = (bps: number | string): string => {
  const bp = typeof bps === "string" ? parseInt(bps) : bps;
  return `${(bp / 100).toFixed(2)}%`;
};

// Format date to readable format
export const formatDate = (timestamp: number | bigint): string => {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Format date and time
export const formatDateTime = (timestamp: number | bigint): string => {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format address (short form)
export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format time remaining (in seconds) to "Xd Xh Xm"
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "Expired";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

// Format ratio as percentage (e.g., 120% collateral ratio)
export const formatRatio = (ratio: number | bigint): string => {
  const r = typeof ratio === "bigint" ? Number(ratio) : ratio;
  return formatNumber((r / 1e4) * 100, 1) + "%";
};

// Format health factor (1.5 = 150% = healthy)
export const formatHealthFactor = (factor: number | bigint): string => {
  const f = typeof factor === "bigint" ? Number(factor) : factor;
  return formatNumber(f / 1e18, 2);
};

// Format credit score (0-1000)
export const formatCreditScore = (score: number | bigint): string => {
  const s = typeof score === "bigint" ? Number(score) : score;
  return Math.floor(s / 1e18).toString();
};
