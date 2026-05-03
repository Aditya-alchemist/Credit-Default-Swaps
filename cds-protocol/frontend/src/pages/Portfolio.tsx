import React from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUnits } from "viem";
import { useTheme } from "../context/ThemeContext";
import { IconImage } from "../components/IconImage";
import { formatAddress, formatBps, formatDate, formatNumber } from "../utils/formatters";
import { useBorrowerLoans, usePoolStats } from "../hooks/useLendingPool";
import { useSellerCollateral, useTotalPositions as useTotalCDSPositions } from "../hooks/useCDSVault";
import { CDS_VAULT_ABI, LENDING_POOL_ABI, SEPOLIA_ADDRESSES } from "../config/contracts";

type SupplyPosition = {
  id: bigint;
  amount: bigint;
  lTokenAmount: bigint;
  depositTimestamp: bigint;
  cdsProtectionEnabled: boolean;
  cdsPositionId: bigint;
};

type LoanPosition = {
  id: bigint;
  loanAmount: bigint;
  collateralAmount: bigint;
  interestRateBps: bigint;
  accruedInterest: bigint;
  openTimestamp: bigint;
  duration: bigint;
  state: number;
};

type CDSPosition = {
  id: bigint;
  buyer: string;
  seller: string;
  referenceEntity: string;
  notional: bigint;
  spreadBps: bigint;
  collateral: bigint;
  maturity: bigint;
  state: number;
};

const asBigIntArray = (value: unknown): bigint[] => Array.isArray(value) ? value.map((item) => BigInt(item)) : [];
const asNumber = (value: bigint, decimals: number) => Number(formatUnits(value, decimals));
const stateLabel = (state: number) => state === 0 ? "Active" : state === 1 ? "Margin Call" : state === 2 ? "Defaulted" : "Expired";
const loanStateLabel = (state: number) => state === 0 ? "Active" : state === 1 ? "Repaid" : "Liquidated";

const Portfolio: React.FC = () => {
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const totalCDSPositions = useTotalCDSPositions();
  const sellerCollateral = useSellerCollateral(address);
  const borrowerLoans = useBorrowerLoans(address);
  const poolStats = usePoolStats();

  const lenderSupplies = useReadContract({
    address: SEPOLIA_ADDRESSES.LendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getLenderSupplies",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const supplyIds = asBigIntArray(lenderSupplies.data);
  const loanIds = asBigIntArray(borrowerLoans.data);
  const totalPositions = totalCDSPositions.data ? Number(totalCDSPositions.data) : 0;
  const cdsIds = Array.from({ length: Math.min(totalPositions, 80) }, (_, index) => BigInt(index + 1));

  const supplyReads = useReadContracts({
    contracts: supplyIds.map((id) => ({
      address: SEPOLIA_ADDRESSES.LendingPool,
      abi: LENDING_POOL_ABI,
      functionName: "getSupplyPosition",
      args: [id],
    })),
    query: { enabled: supplyIds.length > 0 },
  });

  const loanReads = useReadContracts({
    contracts: loanIds.map((id) => ({
      address: SEPOLIA_ADDRESSES.LendingPool,
      abi: LENDING_POOL_ABI,
      functionName: "getLoanPosition",
      args: [id],
    })),
    query: { enabled: loanIds.length > 0 },
  });

  const cdsReads = useReadContracts({
    contracts: cdsIds.map((id) => ({
      address: SEPOLIA_ADDRESSES.CDSVault,
      abi: CDS_VAULT_ABI,
      functionName: "getPosition",
      args: [id],
    })),
    query: { enabled: cdsIds.length > 0 },
  });

  const supplies: SupplyPosition[] = (supplyReads.data ?? [])
    .map((result, index) => {
      const item = result.result as any;
      if (!item) return null;
      return {
        id: supplyIds[index],
        amount: BigInt(item.amount ?? item[1] ?? 0),
        lTokenAmount: BigInt(item.lTokenAmount ?? item[2] ?? 0),
        depositTimestamp: BigInt(item.depositTimestamp ?? item[3] ?? 0),
        cdsProtectionEnabled: Boolean(item.cdsProtectionEnabled ?? item[4]),
        cdsPositionId: BigInt(item.cdsPositionId ?? item[5] ?? 0),
      };
    })
    .filter((item): item is SupplyPosition => item !== null);

  const loans: LoanPosition[] = (loanReads.data ?? [])
    .map((result, index) => {
      const item = result.result as any;
      if (!item) return null;
      return {
        id: loanIds[index],
        loanAmount: BigInt(item.loanAmount ?? item[1] ?? 0),
        collateralAmount: BigInt(item.collateralAmount ?? item[2] ?? 0),
        interestRateBps: BigInt(item.interestRateBps ?? item[3] ?? 0),
        openTimestamp: BigInt(item.openTimestamp ?? item[4] ?? 0),
        accruedInterest: BigInt(item.accruedInterest ?? item[6] ?? 0),
        duration: BigInt(item.duration ?? item[7] ?? 0),
        state: Number(item.state ?? item[8] ?? 0),
      };
    })
    .filter((item): item is LoanPosition => item !== null);

  const cdsPositions: CDSPosition[] = (cdsReads.data ?? [])
    .map((result, index) => {
      const item = result.result as any;
      if (!item) return null;
      return {
        id: cdsIds[index],
        buyer: String(item.buyer ?? item[0] ?? ""),
        seller: String(item.seller ?? item[1] ?? ""),
        referenceEntity: String(item.referenceEntity ?? item[2] ?? ""),
        notional: BigInt(item.notional ?? item[3] ?? 0),
        spreadBps: BigInt(item.spreadBps ?? item[4] ?? 0),
        collateral: BigInt(item.collateral ?? item[5] ?? 0),
        maturity: BigInt(item.maturity ?? item[6] ?? 0),
        state: Number(item.state ?? item[9] ?? 0),
      };
    })
    .filter((item): item is CDSPosition => {
      if (!item || !address) return false;
      return item.buyer.toLowerCase() === address.toLowerCase() || item.seller.toLowerCase() === address.toLowerCase();
    });

  const suppliedValue = supplies.reduce((sum, item) => sum + asNumber(item.amount, 6), 0);
  const borrowedValue = loans
    .filter((loan) => loan.state === 0)
    .reduce((sum, item) => sum + asNumber(item.loanAmount + item.accruedInterest, 6), 0);
  const wethPrice = poolStats.wethPriceUsdc.data ? Number(poolStats.wethPriceUsdc.data) / 1_000_000 : 0;
  const borrowCollateralValue = loans.reduce((sum, item) => sum + asNumber(item.collateralAmount, 18) * wethPrice, 0);
  const cdsNotional = cdsPositions.reduce((sum, item) => sum + asNumber(item.notional, 6), 0);
  const cdsCollateral = cdsPositions.reduce((sum, item) => sum + asNumber(item.collateral, 6), 0);
  const lockedSellerCollateral = sellerCollateral.data ? asNumber(BigInt(sellerCollateral.data as any), 6) : 0;
  const walletEquity = suppliedValue + borrowCollateralValue + lockedSellerCollateral - borrowedValue;

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const gridStroke = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const axisStroke = theme === "dark" ? "#94a3b8" : "#64748b";

  const allocation = [
    { name: "Supplied", value: Math.max(suppliedValue, 0), color: "#2563eb" },
    { name: "Borrow collateral", value: Math.max(borrowCollateralValue, 0), color: "#f97316" },
    { name: "CDS notional", value: Math.max(cdsNotional, 0), color: "#ec4899" },
    { name: "Debt", value: Math.max(borrowedValue, 0), color: "#ef4444" },
  ].filter((item) => item.value > 0);

  const exposureTrend = [
    { label: "Supplied", value: suppliedValue },
    { label: "Collateral", value: borrowCollateralValue },
    { label: "CDS", value: cdsNotional },
    { label: "Debt", value: borrowedValue },
    { label: "Wallet Equity", value: Math.max(walletEquity, 0) },
  ];

  if (!isConnected) {
    return (
      <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
        <div className="lg:ml-64 px-4 lg:px-8">
          <div className={`border rounded-xl p-8 text-center ${cardBgClass}`}>
            <p className={`text-lg ${secondaryTextClass}`}>Connect your wallet to view your portfolio.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Portfolio</h1>
          <p className={secondaryTextClass}>Your CDS collateral, protection positions, lending, and borrowing in one place</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
          <MetricCard title="Wallet Equity" value={`$${formatNumber(walletEquity)}`} subtitle="Supplied + locked collateral - debt" icon="dashboard" />
          <MetricCard title="Supplied" value={`$${formatNumber(suppliedValue)}`} subtitle={`${supplies.length} supply position${supplies.length === 1 ? "" : "s"}`} icon="card" />
          <MetricCard title="Borrowed" value={`$${formatNumber(borrowedValue)}`} subtitle={`${loans.length} loan${loans.length === 1 ? "" : "s"}`} icon="market" />
          <MetricCard title="CDS Notional" value={`$${formatNumber(cdsNotional)}`} subtitle={`${cdsPositions.length} CDS position${cdsPositions.length === 1 ? "" : "s"}`} icon="shield" />
          <MetricCard title="Locked Collateral" value={`$${formatNumber(lockedSellerCollateral)}`} subtitle="Seller collateral in vault" icon="lock" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <div className={`xl:col-span-2 border rounded-xl p-6 ${cardBgClass}`}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className={`text-sm ${secondaryTextClass}`}>Wallet Exposure</p>
                <h2 className={`text-2xl font-bold ${textClass}`}>Capital across protocol functions</h2>
              </div>
              <IconImage name="chart" className="h-10 w-10" alt="" />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={exposureTrend}>
                  <defs>
                    <linearGradient id="portfolioExposure" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} tickFormatter={(value) => `$${formatNumber(Number(value), 0)}`} />
                  <Tooltip formatter={(value: any) => `$${formatNumber(Number(value), 2)}`} />
                  <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fill="url(#portfolioExposure)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm ${secondaryTextClass}`}>Allocation</p>
            <h2 className={`text-2xl font-bold ${textClass} mb-4`}>Protocol mix</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation.length ? allocation : [{ name: "Empty", value: 1, color: "#94a3b8" }]} dataKey="value" innerRadius={66} outerRadius={92} paddingAngle={5}>
                    {(allocation.length ? allocation : [{ name: "Empty", value: 1, color: "#94a3b8" }]).map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${formatNumber(Number(value), 2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {(allocation.length ? allocation : [{ name: "No active balances", value: 0, color: "#94a3b8" }]).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${secondaryTextClass}`}>
                    <span className="h-2 w-8 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className={textClass}>${formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <PortfolioSection title="Lending Supplies" empty="No lending supply positions for this wallet.">
          {supplies.map((item) => (
            <DataRow
              key={String(item.id)}
              title={`Supply #${item.id}`}
              badge={item.cdsProtectionEnabled ? "CDS protected" : "Unprotected"}
              cells={[
                ["Amount", `${formatNumber(asNumber(item.amount, 6))} USDC`],
                ["lTokens", formatNumber(asNumber(item.lTokenAmount, 6))],
                ["Opened", item.depositTimestamp > 0n ? formatDate(item.depositTimestamp) : "-"],
                ["CDS Position", item.cdsPositionId > 0n ? `#${item.cdsPositionId}` : "-"],
              ]}
            />
          ))}
        </PortfolioSection>

        <PortfolioSection title="Borrowing" empty="No borrow positions for this wallet.">
          {loans.map((item) => (
            <DataRow
              key={String(item.id)}
              title={`Loan #${item.id}`}
              badge={loanStateLabel(item.state)}
              cells={[
                ["Debt", `${formatNumber(asNumber(item.loanAmount + item.accruedInterest, 6))} USDC`],
                ["Principal", `${formatNumber(asNumber(item.loanAmount, 6))} USDC`],
                ["Collateral", `${formatNumber(asNumber(item.collateralAmount, 18), 4)} WETH`],
                ["Rate", formatBps(Number(item.interestRateBps))],
              ]}
            />
          ))}
        </PortfolioSection>

        <PortfolioSection title="CDS Positions" empty="No CDS buyer or seller positions for this wallet.">
          {cdsPositions.map((item) => {
            const role = address && item.buyer.toLowerCase() === address.toLowerCase() ? "Buyer" : "Seller";
            return (
              <DataRow
                key={String(item.id)}
                title={`CDS #${item.id} - ${role}`}
                badge={stateLabel(item.state)}
                cells={[
                  ["Notional", `${formatNumber(asNumber(item.notional, 6))} USDC`],
                  ["Collateral", `${formatNumber(asNumber(item.collateral, 6))} USDC`],
                  ["Spread", formatBps(Number(item.spreadBps))],
                  ["Reference", formatAddress(item.referenceEntity)],
                ]}
              />
            );
          })}
        </PortfolioSection>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentProps<typeof IconImage>["name"];
}> = ({ title, value, subtitle, icon }) => {
  const { theme } = useTheme();
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`border rounded-xl p-5 ${cardBgClass}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className={`text-sm ${secondaryTextClass}`}>{title}</p>
        <IconImage name={icon} className="h-7 w-7" alt="" />
      </div>
      <p className={`text-2xl font-bold ${textClass}`}>{value}</p>
      <p className={`mt-2 text-xs ${secondaryTextClass}`}>{subtitle}</p>
    </div>
  );
};

const PortfolioSection: React.FC<{ title: string; empty: string; children: React.ReactNode }> = ({ title, empty, children }) => {
  const { theme } = useTheme();
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <div className={`mb-8 border rounded-xl overflow-hidden ${cardBgClass}`}>
      <div className={`border-b ${theme === "dark" ? "border-slate-800" : "border-slate-200"} px-6 py-4`}>
        <h2 className={`text-lg font-semibold ${textClass}`}>{title}</h2>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {childArray.length ? childArray : <p className={`px-6 py-5 text-sm ${secondaryTextClass}`}>{empty}</p>}
      </div>
    </div>
  );
};

const DataRow: React.FC<{ title: string; badge: string; cells: [string, string][] }> = ({ title, badge, cells }) => {
  const { theme } = useTheme();
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";

  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className={`font-semibold ${textClass}`}>{title}</h3>
        <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-500">{badge}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {cells.map(([label, value]) => (
          <div key={label}>
            <p className={`text-xs ${secondaryTextClass}`}>{label}</p>
            <p className={`mt-1 text-sm font-medium ${textClass}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Portfolio;
