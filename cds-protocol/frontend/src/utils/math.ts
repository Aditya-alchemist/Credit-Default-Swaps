// Math utilities for CDS protocol

// Convert bps to decimal (5000 bps = 0.5)
export const bpsToDecimal = (bps: number): number => bps / 10000;

// Convert decimal to bps (0.5 = 5000 bps)
export const decimalToBps = (decimal: number): number => decimal * 10000;

// Calculate premium quarterly (notional * spread * 0.25)
export const calculateQuarterlyPremium = (notional: number, spreadBps: number): number => {
  return (notional * bpsToDecimal(spreadBps)) / 4;
};

// Calculate required collateral (notional * min ratio %)
export const calculateRequiredCollateral = (notional: number, minRatioBps = 12000): number => {
  return (notional * minRatioBps) / 10000;
};

// Calculate current collateral ratio
export const calculateCollateralRatio = (collateral: number, mtmLoss: number, notional: number): number => {
  const exposure = notional + (mtmLoss > 0 ? mtmLoss : 0);
  return (collateral / exposure) * 10000; // Return in bps
};

// Calculate spread from lambda and recovery rate
// spread = lambda / (1 - recovery)
export const calculateSpread = (lambdaBps: number, recoveryBps: number): number => {
  if (recoveryBps >= 10000) return 0;
  const lambda = bpsToDecimal(lambdaBps);
  const recovery = bpsToDecimal(recoveryBps);
  return decimalToBps(lambda / (1 - recovery));
};

// Preview CDS payout at default
export const calculatePayoutAtDefault = (
  notional: number,
  collateral: number,
  recoveryBps: number
): { buyerPayout: number; sellerSurplus: number } => {
  const recovery = bpsToDecimal(recoveryBps);
  const recoveryAmount = notional * recovery;
  const buyerPayout = notional - recoveryAmount;
  const sellerSurplus = collateral - buyerPayout;
  return { buyerPayout, sellerSurplus };
};

// Calculate health factor for loan
export const calculateHealthFactor = (collateralValue: number, debtValue: number, ltv: number): number => {
  if (debtValue === 0) return 999;
  const maxDebt = (collateralValue * ltv) / 100;
  return maxDebt / debtValue;
};

// Calculate liquidation price
export const calculateLiquidationPrice = (
  collateralAmount: number,
  debtAmount: number,
  currentPrice: number,
  ltv: number
): number => {
  const currentValue = collateralAmount * currentPrice;
  const maxDebtAllowed = (currentValue * ltv) / 100;
  if (maxDebtAllowed === 0) return 0;
  const liquidationValue = (debtAmount * 100) / ltv;
  return liquidationValue / collateralAmount;
};

// Calculate net APY after CDS cost
export const calculateNetAPY = (grossAPY: number, cdsSpreadBps: number): number => {
  const cdsCost = bpsToDecimal(cdsSpreadBps);
  return Math.max(0, grossAPY - cdsCost);
};

// Check if position is near liquidation
export const isNearLiquidation = (healthFactor: number, warningThreshold = 1.5): boolean => {
  return healthFactor < warningThreshold;
};

// Check if margin call is triggered (ratio < 120%)
export const isMarginCallTriggered = (collateralRatioBps: number): boolean => {
  return collateralRatioBps < 12000;
};

// Days until maturity
export const daysUntilMaturity = (maturityTimestamp: number, currentTime = Date.now() / 1000): number => {
  return Math.max(0, Math.floor((maturityTimestamp - currentTime) / 86400));
};
