import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { decodeEventLog, isAddress, parseUnits } from "viem";
import { formatUnits } from "viem";
import { formatUsdc, formatNumber } from "../utils/formatters";
import { useDeposit, useBorrow, useRepay } from "../hooks/useLendingPool";
import { useApprovalNeeded, useApproveToken } from "../hooks/useERC20";
import { useTx } from "../context/TxContext";
import { LENDING_POOL_ABI, SEPOLIA_ADDRESSES } from "../config/contracts";
import { extractErrorMessage, getExplorerUrl } from "../utils/txHelpers";
import { usePoolStats } from "../hooks/useLendingPool";

const LendingPool: React.FC = () => {
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"supply" | "borrow">("supply");
  const poolStats = usePoolStats();

  const totalSupplied = poolStats.totalSupplied.data ? Number(formatUnits(BigInt(poolStats.totalSupplied.data as any), 6)) : 0;
  const totalBorrowed = poolStats.totalBorrowed.data ? Number(formatUnits(BigInt(poolStats.totalBorrowed.data as any), 6)) : 0;
  const availableLiquidity = poolStats.availableLiquidity.data ? Number(formatUnits(BigInt(poolStats.availableLiquidity.data as any), 6)) : 0;
  const utilizationRate = poolStats.utilizationRate.data ? Number(poolStats.utilizationRate.data) : 0;
  // Contract returns price scaled by 1e6; convert to human USD
  const wethPriceUsdc = poolStats.wethPriceUsdc.data ? Number(poolStats.wethPriceUsdc.data) / 1_000_000 : 0;
  const borrowApy = 5.0;
  const supplyApy = 5.0;

  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-slate-50";
  const cardBgClass = theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryTextClass = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const inputBgClass = theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-300";

  return (
    <div className={`min-h-screen ${bgClass} pt-24 pb-12`}>
      <div className="lg:ml-64 px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${textClass} mb-2`}>Lending Pool</h1>
          <p className={secondaryTextClass}>Deposit to earn interest or borrow against collateral</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>Total Supplied</p>
            <p className={`text-3xl font-bold ${textClass} mb-1`}>${formatNumber(totalSupplied)}</p>
            <p className={`text-sm text-green-400`}>Live pool balance</p>
          </div>
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>Total Borrowed</p>
            <p className={`text-3xl font-bold ${textClass} mb-1`}>${formatNumber(totalBorrowed)}</p>
            <p className={`text-sm text-orange-400`}>{formatNumber(utilizationRate / 100, 1)}% Utilization</p>
          </div>
          <div className={`border rounded-xl p-6 ${cardBgClass}`}>
            <p className={`text-sm font-medium ${secondaryTextClass} mb-2`}>Supply APY</p>
            <p className={`text-3xl font-bold text-green-400 mb-1`}>{supplyApy.toFixed(1)}%</p>
            <p className={`text-sm ${secondaryTextClass}`}>Derived from the live lending rate</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-1">
            <div className={`border rounded-xl p-6 ${cardBgClass} sticky top-24`}>
              {/* Tab Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab("supply")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === "supply"
                      ? "bg-green-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  Supply
                </button>
                <button
                  onClick={() => setActiveTab("borrow")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    activeTab === "borrow"
                      ? "bg-blue-600 text-white"
                      : theme === "dark"
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  Borrow
                </button>
              </div>

              {activeTab === "supply" ? (
                <SupplyForm theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} inputBgClass={inputBgClass} />
              ) : (
                <BorrowForm theme={theme} cardBgClass={cardBgClass} textClass={textClass} secondaryTextClass={secondaryTextClass} inputBgClass={inputBgClass} />
              )}
            </div>
          </div>

          {/* Right Column - Live Pool Snapshot */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Live Pool Snapshot</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`rounded-lg border p-4 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                  <p className={`text-sm ${secondaryTextClass}`}>Available Liquidity</p>
                  <p className={`text-2xl font-bold ${textClass}`}>${formatNumber(availableLiquidity)}</p>
                </div>
                <div className={`rounded-lg border p-4 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                  <p className={`text-sm ${secondaryTextClass}`}>WETH Price</p>
                  <p className={`text-2xl font-bold ${textClass}`}>${formatNumber(wethPriceUsdc)}</p>
                </div>
                <div className={`rounded-lg border p-4 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                  <p className={`text-sm ${secondaryTextClass}`}>Borrow APY</p>
                  <p className={`text-2xl font-bold ${textClass}`}>{borrowApy.toFixed(1)}%</p>
                </div>
                <div className={`rounded-lg border p-4 ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                  <p className={`text-sm ${secondaryTextClass}`}>Supply APY</p>
                  <p className={`text-2xl font-bold ${textClass}`}>{supplyApy.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className={`border rounded-xl p-6 ${cardBgClass}`}>
              <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Pool Breakdown</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className={`font-medium ${textClass}`}>USDC Pool</p>
                    <div className="text-right">
                      <p className={`text-sm ${textClass}`}>${formatNumber(totalBorrowed)} / ${formatNumber(totalSupplied)}</p>
                      <p className={`text-xs ${secondaryTextClass}`}>{formatNumber(utilizationRate / 100, 1)}% utilized</p>
                    </div>
                  </div>
                  <div className={`w-full h-3 rounded-full border ${theme === "dark" ? "border-slate-700" : "border-slate-300"} bg-slate-200`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${Math.min(100, utilizationRate / 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className={`font-medium ${textClass}`}>WETH Collateral Market</p>
                    <div className="text-right">
                      <p className={`text-sm ${textClass}`}>1 WETH = ${formatNumber(wethPriceUsdc)}</p>
                      <p className={`text-xs ${secondaryTextClass}`}>Price getter from lending contract</p>
                    </div>
                  </div>
                  <div className={`w-full h-3 rounded-full border ${theme === "dark" ? "border-slate-700" : "border-slate-300"} bg-slate-200`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: "100%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FormProps {
  theme: string;
  cardBgClass: string;
  textClass: string;
  secondaryTextClass: string;
  inputBgClass: string;
}

const SupplyForm: React.FC<FormProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [buyProtection, setBuyProtection] = useState(false);
  const [sellerAddress, setSellerAddress] = useState(address ?? "");

  const amountNum = parseFloat(amount) || 0;
  const amountUnits = amount ? parseUnits(amount, 6) : 0n;
  const protectionCollateralUnits = (amountUnits * 12000n) / 10000n;
  const apy = 5.8;
  const earnedPerYear = amountNum * (apy / 100);
  const { notifyPending, notifySuccess, notifyError } = useTx();
  const { write } = useDeposit(amountUnits > 0n ? amountUnits : undefined);
  const { isNeeded: needsDepositApproval } = useApprovalNeeded(
    SEPOLIA_ADDRESSES.USDC,
    SEPOLIA_ADDRESSES.LendingPool,
    amountUnits > 0n ? amountUnits : undefined
  );
  const depositApproval = useApproveToken(
    amountUnits > 0n
      ? { tokenAddress: SEPOLIA_ADDRESSES.USDC, spender: SEPOLIA_ADDRESSES.LendingPool, amount: amountUnits }
      : undefined
  );
  const sellerIsConnected = !!address && !!sellerAddress && sellerAddress.toLowerCase() === address.toLowerCase();
  const { isNeeded: needsProtectionApproval } = useApprovalNeeded(
    SEPOLIA_ADDRESSES.USDC,
    SEPOLIA_ADDRESSES.CDSVault,
    buyProtection && sellerIsConnected ? protectionCollateralUnits : undefined
  );
  const protectionApproval = useApproveToken(
    buyProtection && sellerIsConnected && protectionCollateralUnits > 0n
      ? { tokenAddress: SEPOLIA_ADDRESSES.USDC, spender: SEPOLIA_ADDRESSES.CDSVault, amount: protectionCollateralUnits }
      : undefined
  );

  const extractSupplyId = (logs: any[]) => {
    for (const log of logs) {
      if (String(log.address).toLowerCase() !== SEPOLIA_ADDRESSES.LendingPool.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: LENDING_POOL_ABI,
          eventName: "Deposited",
          data: log.data,
          topics: log.topics,
        });
        return (decoded.args as any).supplyId as bigint;
      } catch {
        // Ignore non-Deposited logs.
      }
    }
    return undefined;
  };

  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Supply Assets</h3>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Asset</label>
        <select className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}>
          <option>USDC</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Amount</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            className={`flex-1 px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button className={`px-4 py-2 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            MAX
          </button>
        </div>
      </div>

      <div className={`px-4 py-3 rounded-lg border ${inputBgClass} space-y-3`}>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={buyProtection}
            onChange={(e) => setBuyProtection(e.target.checked)}
            className="h-4 w-4"
          />
          <span className={`text-sm font-medium ${textClass}`}>Buy CDS protection after deposit</span>
        </label>
        {buyProtection && (
          <div>
            <label className={`block text-sm font-medium ${textClass} mb-2`}>Protection Seller Address</label>
            <input
              value={sellerAddress}
              onChange={(e) => setSellerAddress(e.target.value)}
              placeholder="0x seller / collateral provider"
              className={`w-full px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <p className={`text-xs ${secondaryTextClass} mt-1`}>
              If this is your wallet, the flow also approves {formatNumber(Number(protectionCollateralUnits) / 1e6)} USDC collateral for the vault.
            </p>
          </div>
        )}
      </div>

      <div className={`px-4 py-3 rounded-lg border ${inputBgClass}`}>
        <p className={`text-sm ${secondaryTextClass} mb-2`}>Earning Estimate</p>
        <p className={`text-2xl font-bold text-green-400`}>${earnedPerYear.toFixed(2)}</p>
        <p className={`text-xs ${secondaryTextClass} mt-1`}>per year at {apy}% APY</p>
      </div>

      <button
        onClick={async () => {
          try {
            if (amountUnits <= 0n) throw new Error("Enter a supply amount greater than zero");
            if (buyProtection && (!sellerAddress || !isAddress(sellerAddress))) {
              throw new Error("Enter a valid protection seller address");
            }

            const id = notifyPending(
              buyProtection
                ? "Approving, supplying, and buying CDS protection"
                : needsDepositApproval
                  ? "Approving and supplying to pool"
                  : "Supplying to pool"
            );

            if (needsDepositApproval) {
              const approveHash = await depositApproval.write.writeAsync();
              if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
            }

            if (!write?.writeAsync) throw new Error("contract not ready");
            const depositHash = await write.writeAsync();
            const receipt = publicClient
              ? await publicClient.waitForTransactionReceipt({ hash: depositHash })
              : undefined;

            if (buyProtection) {
              const supplyId = receipt ? extractSupplyId([...receipt.logs]) : undefined;
              if (supplyId === undefined) throw new Error("Could not find supplyId from deposit receipt");

              if (sellerIsConnected && needsProtectionApproval) {
                const approveVaultHash = await protectionApproval.write.writeAsync();
                if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveVaultHash });
              }

              const protectionHash = await writeContractAsync({
                address: SEPOLIA_ADDRESSES.LendingPool,
                abi: LENDING_POOL_ABI,
                functionName: "enableCDSProtection",
                args: [supplyId, sellerAddress as `0x${string}`],
              });
              if (publicClient) await publicClient.waitForTransactionReceipt({ hash: protectionHash });
            }

            notifySuccess(id, buyProtection ? "Supply and CDS protection confirmed" : "Supply confirmed", {
              txHash: depositHash,
              explorerUrl: getExplorerUrl(depositHash),
            });
          } catch (e: any) {
            notifyError(Date.now(), extractErrorMessage(e));
          }
        }}
        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
      >
        {buyProtection ? "Approve + Supply + Buy CDS" : needsDepositApproval ? "Approve + Supply" : "Supply"}
      </button>
    </div>
  );
};

const BorrowForm: React.FC<FormProps> = ({ theme, cardBgClass, textClass, secondaryTextClass, inputBgClass }) => {
  const publicClient = usePublicClient();
  const [collateral, setCollateral] = useState("");
  const [borrow, setBorrow] = useState("");
  const [repayLoanId, setRepayLoanId] = useState("");
  const poolStats = usePoolStats();
  const wethPriceUsdc = poolStats.wethPriceUsdc.data ? Number(poolStats.wethPriceUsdc.data) : 0;

  const collateralNum = parseFloat(collateral) || 0;
  const borrowNum = parseFloat(borrow) || 0;
  const collateralUnits = collateral ? parseUnits(collateral, 18) : 0n;
  const borrowUnits = borrow ? parseUnits(borrow, 6) : 0n;
  const collateralValue = collateralNum * (wethPriceUsdc / 1_000_000);
  const maxBorrow = collateralValue * 0.75; // 75% LTV
  const healthFactor = collateralValue / (borrowNum || 1) / 1.5;

  const { notifyPending, notifySuccess, notifyError } = useTx();
  const { prepare: borrowPrepare, write: borrowWrite } = useBorrow(
    collateralUnits > 0n ? collateralUnits : undefined,
    borrowUnits > 0n ? borrowUnits : undefined,
    0n
  );
  const { isNeeded: needsWethApproval } = useApprovalNeeded(
    SEPOLIA_ADDRESSES.WETH,
    SEPOLIA_ADDRESSES.LendingPool,
    collateralUnits > 0n ? collateralUnits : undefined
  );
  const wethApproval = useApproveToken(
    collateralUnits > 0n
      ? { tokenAddress: SEPOLIA_ADDRESSES.WETH, spender: SEPOLIA_ADDRESSES.LendingPool, amount: collateralUnits }
      : undefined
  );
  const repayIdNum = repayLoanId ? Number(repayLoanId) : undefined;
  const { prepare: repayPrepare, write: repayWrite } = useRepay(repayIdNum);

  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Borrow Assets</h3>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Collateral (WETH)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            placeholder="1"
            className={`flex-1 px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button className={`px-4 py-2 border rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-slate-700 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}>
            MAX
          </button>
        </div>
        <p className={`text-xs ${secondaryTextClass} mt-1`}>= ${collateralValue.toFixed(2)}</p>
      </div>

      <div>
        <label className={`block text-sm font-medium ${textClass} mb-2`}>Borrow (USDC)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={borrow}
            onChange={(e) => setBorrow(e.target.value)}
            placeholder="1500"
            className={`flex-1 px-4 py-2 rounded-lg border ${inputBgClass} ${textClass} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            onClick={() => setBorrow(maxBorrow.toFixed(2))}
            className={`px-4 py-2 border rounded-lg font-medium transition ${
              theme === "dark"
                ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                : "border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            MAX
          </button>
        </div>
        <p className={`text-xs ${secondaryTextClass} mt-1`}>Max: ${maxBorrow.toFixed(2)}</p>
      </div>

      <div className={`px-4 py-3 rounded-lg border ${inputBgClass} space-y-2`}>
        <div className="flex justify-between items-center">
          <p className={`text-sm ${secondaryTextClass}`}>Health Factor</p>
          <p className={`font-bold ${healthFactor > 1.5 ? "text-green-400" : healthFactor > 1.2 ? "text-yellow-400" : "text-red-400"}`}>
            {healthFactor.toFixed(2)}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-sm ${secondaryTextClass}`}>LTV</p>
          <p className={`font-bold ${borrowNum <= maxBorrow ? "text-green-400" : "text-red-400"}`}>
            {((borrowNum / maxBorrow) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-sm ${secondaryTextClass}`}>Borrow APY</p>
          <p className="font-bold text-red-400">6.9%</p>
        </div>
      </div>

      <button
        onClick={async () => {
          try {
            if (collateralUnits <= 0n) throw new Error("Enter WETH collateral greater than zero");
            if (borrowUnits <= 0n) throw new Error("Enter USDC borrow amount greater than zero");
            const id = notifyPending(needsWethApproval ? "Approving collateral and borrowing" : "Borrowing from pool");
            if (needsWethApproval) {
              const approveHash = await wethApproval.write.writeAsync();
              if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
            }
            if (!borrowWrite?.writeAsync) throw new Error("contract not ready");
            const hash = await borrowWrite.writeAsync();
            if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
            notifySuccess(id, "Borrow confirmed", {
              txHash: hash,
              explorerUrl: getExplorerUrl(hash),
            });
          } catch (e: any) {
            notifyError(Date.now(), extractErrorMessage(e));
          }
        }}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
      >
        {needsWethApproval ? "Approve + Borrow" : "Borrow"}
      </button>

      <div className="mt-4 border-t pt-4">
        <h4 className={`text-sm font-semibold ${textClass} mb-2`}>Repay Loan</h4>
        <div className="flex gap-2 mb-2">
          <input value={repayLoanId} onChange={(e) => setRepayLoanId(e.target.value)} placeholder="loan id" className="flex-1 px-3 py-2 rounded-lg border" />
        </div>
        <button
          onClick={async () => {
            try {
              const id = notifyPending("Repaying loan");
              if (!repayWrite?.writeAsync) throw new Error("contract not ready");
              const hash = await repayWrite.writeAsync();
              if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
              notifySuccess(id, "Repay confirmed", {
                txHash: hash,
                explorerUrl: getExplorerUrl(hash),
              });
            } catch (e: any) {
              notifyError(Date.now(), extractErrorMessage(e));
            }
          }}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
        >
          Repay
        </button>
      </div>
    </div>
  );
};

export default LendingPool;
