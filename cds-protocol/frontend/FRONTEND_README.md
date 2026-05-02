# CDS Protocol Frontend

A complete React + TypeScript frontend for the Credit Default Swaps protocol. Built with Wagmi v2, Viem, TanStack Query, and Tailwind CSS.

## Tech Stack

- **React 18** + **TypeScript** - UI framework
- **Wagmi v2** + **Viem** - Wallet connection & contract interactions
- **TanStack Query** - Data fetching & caching
- **Tailwind CSS** - Styling
- **Recharts** - Charts & visualizations
- **React Router** - Navigation

## Project Structure

```
src/
├── config/
│   ├── contracts.ts          # Contract addresses & ABIs
│   └── wagmi.ts              # Wagmi configuration
│
├── pages/
│   ├── Dashboard.tsx         # Protocol overview & stats
│   ├── CDSMarket.tsx         # Open & manage CDS positions
│   ├── LendingPool.tsx       # Supply/borrow USDC
│   ├── PositionDetail.tsx    # Single position details
│   ├── EntityRisk.tsx        # Entity credit health
│   ├── MarginDashboard.tsx   # Margin call monitoring
│   └── Admin.tsx             # Admin panel (owner only)
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx        # Navigation bar
│   │   └── WalletButton.tsx  # Wallet connection
│   ├── cds/                  # CDS-specific components
│   ├── lending/              # Lending-specific components
│   └── oracle/               # Oracle components
│
├── hooks/
│   ├── useCDSVault.ts        # CDS position operations
│   ├── usePremiumEngine.ts   # Premium collection
│   ├── useMarginEngine.ts    # Margin & liquidation
│   ├── useSettlementEngine.ts# Settlement payouts
│   ├── useLendingPool.ts     # Lending operations
│   └── useCreditOracle.ts    # Credit data & defaults
│
├── utils/
│   ├── formatters.ts         # Number/date formatting
│   ├── math.ts               # Protocol calculations
│   └── constants.ts          # Shared constants
│
├── App.tsx                   # Main app with routing
└── main.tsx                  # Vite entry point
```

## Pages Overview

### 1. Dashboard (Home)
- Protocol stats (TVL, open positions, active loans, defaults)
- Entity health table with credit scores & spreads
- Your positions overview
- Links to market & lending pages

### 2. CDS Market
- **For Sellers**: Open new CDS positions with auto-calculated collateral & premiums
- **For Buyers**: View & pay premiums on existing positions
- Position cards with MtM and status
- Quick access to position details

### 3. Lending Pool
- **Supply Tab**: Deposit USDC with optional CDS protection, earn interest
- **Borrow Tab**: Borrow against WETH collateral with real-time health factor & liquidation price
- Risk indicators and safety buffers

### 4. Position Detail (TODO)
- Full breakdown of a single position
- MtM loss & current ratio
- Premium schedule & payment history
- Top-up collateral, pay premium, or exit

### 5. Entity Risk (TODO)
- Credit score & spread history charts
- Active CDS positions for entity
- Default status indicator
- Last update timestamp

### 6. Margin Dashboard (TODO)
- Warning list of positions under margin call
- Quick "Top Up" buttons
- All seller positions with collateral ratios
- Deadline countdowns

### 7. Admin Panel (TODO - Owner Only)
- **Token Faucet**: Mint test tokens for users (testnet only)
- **Contract Wiring**: Set engine addresses after deploy
- **Credit Event Control**: Declare/revoke defaults
- **Manual Oracle Push**: Force-update credit scores
- **Emergency Pause**: Pause/unpause contracts
- **Role Manager**: Grant/revoke keeper & liquidator roles
- **Fee Config**: Adjust protocol parameters

## Setup Instructions

### 1. Install Dependencies

```bash
cd cds-protocol/frontend
npm install

# If you need additional UI components (optional)
npm install @radix-ui/react-dialog @radix-ui/react-select
```

### 2. Configure Environment

Create `.env.local` (not committed):

```env
# WalletConnect Project ID (get from https://cloud.walletconnect.com)
VITE_WALLETCONNECT_ID=your_project_id_here

# Optional: RPC URLs (fallback if not in wagmi config)
VITE_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 3. Update Contract Addresses

After deploying contracts on Sepolia, update addresses in `src/config/contracts.ts`:

```typescript
export const SEPOLIA_ADDRESSES = {
  USDC: "0x...",
  WETH: "0x...",
  CDSVault: "0x...",
  // ... rest of addresses
};
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
npm run preview  # Test production build locally
```

## Custom Hooks Reference

### CDS Vault
```typescript
useTotalPositions()           // Total positions count
useCDSPosition(id)            // Get specific position
useOpenCDS()                  // Open new position (write)
useTopUpCollateral()          // Add collateral (write)
useSellerCollateral(address)  // Total collateral locked
```

### Premium Engine
```typescript
useIsPremiumMissed(posId)     // Check if premium missed
useNextPremiumDue(posId)      // Get next due date
useCollectPremium()           // Collect premium (write)
```

### Margin Engine
```typescript
useComputeMtM(posId)          // Mark-to-market loss
useComputeCurrentRatio(posId) // Collateral ratio
useMarginCallDeadline(posId)  // When margin call expires
useCheckAndFlag()             // Trigger margin call (write)
```

### Settlement Engine
```typescript
usePreviewPayout(posId)       // Preview payout amounts
useSettleCDS()                // Settle single position (write)
useBatchSettleCDS()           // Settle multiple (write)
```

### Lending Pool
```typescript
useHealthFactor(loanId)       // Loan health status
useLiquidationPrice(loanId)   // Liquidation threshold
useDeposit()                  // Deposit USDC (write)
useBorrow()                   // Borrow USDC (write)
useRepay()                    // Repay loan (write)
useLiquidate()                // Liquidate borrower (write)
```

### Credit Oracle
```typescript
useCreditData(entity)         // Get credit info
useSpread(entity)             // Get spread in bps
useIsStale(entity)            // Check if data stale
useIsCreditEventDeclared()    // Check if defaulted
useSetCreditData()            // Update credit data (write)
useMarkDefaulted()            // Declare default (write)
```

## Utility Functions

### Formatters (`utils/formatters.ts`)
```typescript
formatUsdc(weiAmount)         // Format to USDC (6 decimals)
formatWeth(weiAmount)         // Format to WETH (18 decimals)
formatBps(bps)                // Format basis points (200 → "2.00%")
formatNumber(num, decimals)   // Format with commas
formatAddress(addr)           // Shorten address (0x1234...5678)
formatDate(timestamp)         // Format Unix timestamp
formatTimeRemaining(seconds)  // Format remaining time (2d 5h)
formatRatio(ratio)            // Format as percentage
formatHealthFactor(factor)    // Format health factor
formatCreditScore(score)      // Format credit score (0-1000)
```

### Math (`utils/math.ts`)
```typescript
calculateQuarterlyPremium()   // Calculate premium payment
calculateRequiredCollateral() // Calculate 120% collateral needed
calculateCollateralRatio()    // Calculate current ratio
calculateSpread()             // Calculate spread from lambda & recovery
calculatePayoutAtDefault()    // Preview payout amounts
calculateHealthFactor()       // Calculate loan health
calculateLiquidationPrice()   // Calculate liquidation threshold
isMarginCallTriggered()       // Check if < 120% ratio
isNearLiquidation()           // Check if health < 1.5
daysUntilMaturity()           // Calculate days remaining
```

## Common Development Tasks

### Add a New Hook

1. Create `src/hooks/useMyFeature.ts`
2. Use `useReadContract` or `useWriteContract` from wagmi
3. Reference contract ABI from `src/config/contracts.ts`
4. Example:

```typescript
import { useReadContract } from "wagmi";
import { SEPOLIA_ADDRESSES, MY_ABI } from "../config/contracts";

export const useMyFeature = (param: string) => {
  return useReadContract({
    address: SEPOLIA_ADDRESSES.MyContract,
    abi: MY_ABI,
    functionName: "myFunction",
    args: [param],
  });
};
```

### Add a New Page

1. Create `src/pages/MyPage.tsx`
2. Use hooks for data fetching
3. Add route in `App.tsx`
4. Example:

```typescript
import { useMyHook } from "../hooks/useMyHook";
import { Navbar } from "../components/layout/Navbar";

export default function MyPage() {
  const { data, isLoading } = useMyHook();
  
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      {/* Page content */}
    </div>
  );
}
```

### Create a Reusable Component

1. Create `src/components/MyComponent.tsx`
2. Use Tailwind for styling
3. Accept props for customization
4. Example:

```typescript
interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, trend }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {trend && <p className={trend > 0 ? "text-green-400" : "text-red-400"}>
        {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
      </p>}
    </div>
  );
};
```

## Styling with Tailwind

The frontend uses a dark theme (slate-950 background). Key color scheme:

- **Primary Actions**: `bg-blue-600` (borrows, settlements)
- **Positive/Supply**: `bg-green-600` (deposits, healthy)
- **Warning/Margin Call**: `bg-yellow-600` (warnings)
- **Danger/Default**: `bg-red-600` (liquidations, defaults)
- **Background**: `bg-slate-950` (main), `bg-slate-900` (cards), `bg-slate-800` (inputs)
- **Borders**: `border-slate-700`
- **Text**: `text-white` (primary), `text-slate-400` (secondary)

## Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Deploy to Netlify

```bash
# Build
npm run build

# Deploy dist/ folder to Netlify
```

### Deploy to Traditional Server

```bash
npm run build
# Copy dist/ to your server's public directory
# Configure your web server to serve index.html for all routes
```

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
```

### Wagmi not connecting to wallet
- Check `VITE_WALLETCONNECT_ID` is set
- Check `wagmi.ts` configuration
- Open browser console for errors

### Contract calls failing
- Verify contract addresses match deployed addresses
- Check ABI is correct
- Ensure user is on Sepolia network
- Check user has enough gas

### Styling not working
```bash
# Rebuild Tailwind
npm run dev
# or
npx tailwindcss -i ./src/index.css -o ./src/output.css
```

## Next Steps

1. ✅ Complete the remaining pages (PositionDetail, EntityRisk, MarginDashboard, Admin)
2. ✅ Add chart visualizations (Recharts for spread history, portfolio charts)
3. ✅ Implement transaction status notifications
4. ✅ Add mobile-responsive improvements
5. ✅ Deploy to testnet
6. ✅ Add unit tests (Vitest + React Testing Library)
7. ✅ Optimize performance (code splitting, lazy loading)

## Support

- Wagmi Docs: https://wagmi.sh/
- Viem Docs: https://viem.sh/
- Tailwind Docs: https://tailwindcss.com/
- React Router: https://reactrouter.com/
