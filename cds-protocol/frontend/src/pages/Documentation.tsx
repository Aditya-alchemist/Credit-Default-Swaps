import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MermaidDiagram = ({ markup, title }: { markup: string; title: string }) => {
  const iframeId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  React.useEffect(() => {
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (!iframe) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .mermaid {
            display: flex;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <div class="mermaid">
          ${markup}
        </div>
        <script>
          mermaid.contentLoaderFactory.defaultLoaderID = 'mermaid-${iframeId}';
          mermaid.initialize({ startOnLoad: true, theme: 'default' });
          mermaid.contentLoaderFactory.load();
        </script>
      </body>
      </html>
    `;

    iframe.srcDoc = html;
  }, [markup, iframeId]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <iframe
        id={iframeId}
        style={{
          width: '100%',
          height: '500px',
          border: 'none',
          borderRadius: '8px',
          background: 'white',
        }}
      />
    </div>
  );
};

const Documentation = () => {
  const { isDark } = useTheme();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    architecture: true,
    formulas: true,
    smartcontracts: false,
    backend: false,
    bot: false,
    testing: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const architectureDiagram = `graph TB
    A["🎯 Protection Buyer"] -->|Pays Premium| B["CDS Vault"]
    C["🏦 Protection Seller"] -->|Deposits Collateral| B
    B -->|Creates Position NFT| D["CDS Token"]
    B -->|Checks Margin| E["Margin Engine"]
    B -->|Collects Premium| F["Premium Engine"]
    B -->|Settles on Default| G["Settlement Engine"]
    E -->|Checks Credit Score| H["Credit Oracle"]
    F -->|Schedules Payments| I["Premium Timeline"]
    G -->|Calculates Payout| J["Recovery Rate DB"]
    H -->|Updates Spreads| K["Keeper Bot"]
    K -->|Triggers Jobs| L["Job Scheduler"]
    M["FastAPI Backend"] -->|Health Checks| K
    N["React Frontend"] -->|Display Positions| O["Position Details"]`;

  const marginCallDiagram = `graph LR
    A["Collateral Ratio < 120%"] -->|Detected| B["Margin Call Triggered"]
    B -->|Start Timer| C["4 Hour Window"]
    C -->|Option 1| D["Seller Tops Up Collateral"]
    D -->|Resolved| E["Position Saved"]
    C -->|Option 2| F["4 Hours Elapse"]
    F -->|Liquidated| G["Position Liquidated"]`;

  const premiumTimelineDiagram = `timeline
    title Premium Payment Timeline
    "Day 0: Position Opens" : First premium due = Now + 90 days
    "Day 85-89" : Premium DUE (on Day 90)
    "Day 90" : PAYMENT WINDOW OPENS
    "Day 90-113" : GRACE PERIOD (24 hour buffer after Day 114)
    "Day 114" : PREMIUM MISSED
    "Day 115+" : MARGIN CALL TRIGGERED`;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">CDS Protocol Documentation</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Complete guide to the Credit Default Swaps protocol
          </p>
          <div className="flex gap-4 items-center">
            <a
              href="https://github.com/Aditya-alchemist/Credit-Default-Swaps"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <ExternalLink size={18} />
              GitHub Repository
            </a>
            <a
              href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <ExternalLink size={18} />
              Full README
            </a>
          </div>
        </div>

        {/* Architecture Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('architecture')}
            className={`w-full text-left p-4 rounded-lg ${
              isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-100'
            } border border-slate-200 dark:border-slate-700 font-semibold flex items-center justify-between`}
          >
            <span className="text-xl">🏗️ System Architecture</span>
            <span>{expandedSections.architecture ? '▼' : '▶'}</span>
          </button>
          {expandedSections.architecture && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="mb-4">
                The protocol consists of six core smart contracts that work together to manage CDS positions, premiums, margins, and settlements.
              </p>
              <MermaidDiagram markup={architectureDiagram} title="CDS Protocol Architecture" />
            </div>
          )}
        </div>

        {/* Core Formulas Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('formulas')}
            className={`w-full text-left p-4 rounded-lg ${
              isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-100'
            } border border-slate-200 dark:border-slate-700 font-semibold flex items-center justify-between`}
          >
            <span className="text-xl">📐 Core Financial Formulas</span>
            <span>{expandedSections.formulas ? '▼' : '▶'}</span>
          </button>
          {expandedSections.formulas && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">1. Premium Calculation</h3>
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded mb-2 overflow-x-auto">
                  Premium = (Notional × Spread (bps) × Days Elapsed) / (10,000 × 360)
                </code>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Example: ($100,000 × 150 × 90) / (10,000 × 360) = $375 USDC quarterly premium
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">2. PV01 (Price Value of 1 Basis Point)</h3>
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded mb-2 overflow-x-auto">
                  PV01 = (Notional × Days Remaining) / (10,000 × 360)
                </code>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Dollar value change for every 1 basis point movement in spreads
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3. Mark-to-Market Loss</h3>
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded mb-2 overflow-x-auto">
                  MtM Loss = ((Current Spread - Entry Spread) × PV01) / 10,000
                </code>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Unrealized losses for the seller when spreads widen
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">4. Collateral Ratio</h3>
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded mb-2 overflow-x-auto">
                  Collateral Ratio (bps) = (Collateral × 10,000) / (Notional + MtM Loss)
                </code>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Minimum threshold: 12,000 bps (120%). Falls below triggers margin call.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">5. Settlement Payout</h3>
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded mb-2 overflow-x-auto">
                  Payout = (Notional × (10,000 - Recovery Rate (bps))) / 10,000
                </code>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Example: ($100,000 × (10,000 - 4,000)) / 10,000 = $60,000 payout (40% recovery)
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">6. Health Factor (Lending)</h3>
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded mb-2 overflow-x-auto">
                  Health Factor = (Collateral × Collateral Factor (bps)) / Total Debt Owed
                </code>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Minimum: > 1.0. Collateral factor: 8,000 bps (80%)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Margin Call Flow Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('smartcontracts')}
            className={`w-full text-left p-4 rounded-lg ${
              isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-100'
            } border border-slate-200 dark:border-slate-700 font-semibold flex items-center justify-between`}
          >
            <span className="text-xl">⚡ Margin Call Process</span>
            <span>{expandedSections.smartcontracts ? '▼' : '▶'}</span>
          </button>
          {expandedSections.smartcontracts && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="mb-4">
                When a position's collateral ratio falls below 120%, a margin call is triggered. The seller has 4 hours to either top up collateral or the position gets liquidated.
              </p>
              <MermaidDiagram markup={marginCallDiagram} title="Margin Call Liquidation Flow" />
            </div>
          )}
        </div>

        {/* Premium Timeline Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('backend')}
            className={`w-full text-left p-4 rounded-lg ${
              isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-100'
            } border border-slate-200 dark:border-slate-700 font-semibold flex items-center justify-between`}
          >
            <span className="text-xl">⏰ Premium Payment Timeline</span>
            <span>{expandedSections.backend ? '▼' : '▶'}</span>
          </button>
          {expandedSections.backend && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="mb-4">
                Premiums are collected quarterly (every 90 days). There's a 24-hour grace period after the due date. Missing payment triggers margin call.
              </p>
              <MermaidDiagram markup={premiumTimelineDiagram} title="Premium Collection Timeline" />
            </div>
          )}
        </div>

        {/* Key Components Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('bot')}
            className={`w-full text-left p-4 rounded-lg ${
              isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-100'
            } border border-slate-200 dark:border-slate-700 font-semibold flex items-center justify-between`}
          >
            <span className="text-xl">🤖 Keeper Bot Jobs</span>
            <span>{expandedSections.bot ? '▼' : '▶'}</span>
          </button>
          {expandedSections.bot && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <h3 className="font-semibold text-blue-600 dark:text-blue-400">Job 1: Check Margins</h3>
                <p className="text-sm">Runs every 60 seconds. Scans all positions and triggers margin calls if collateral ratio is below 120%.</p>
              </div>

              <div>
                <h3 className="font-semibold text-blue-600 dark:text-blue-400">Job 2: Liquidate Expired Calls</h3>
                <p className="text-sm">Runs every 120 seconds. Executes liquidation after 4-hour margin call window expires.</p>
              </div>

              <div>
                <h3 className="font-semibold text-blue-600 dark:text-blue-400">Job 3: Push Oracle Updates</h3>
                <p className="text-sm">Runs every 300 seconds. Fetches entity credit scores from API and updates on-chain oracle.</p>
              </div>

              <div>
                <h3 className="font-semibold text-blue-600 dark:text-blue-400">Job 4: Check Missed Premiums</h3>
                <p className="text-sm">Detects and logs missed premium payments for positions past grace period.</p>
              </div>
            </div>
          )}
        </div>

        {/* Testing Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('testing')}
            className={`w-full text-left p-4 rounded-lg ${
              isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-100'
            } border border-slate-200 dark:border-slate-700 font-semibold flex items-center justify-between`}
          >
            <span className="text-xl">✅ Test Suite (92 Tests)</span>
            <span>{expandedSections.testing ? '▼' : '▶'}</span>
          </button>
          {expandedSections.testing && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded">
                  <h4 className="font-semibold mb-2">Unit Tests</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">17</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Individual component tests</p>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded">
                  <h4 className="font-semibold mb-2">Integration Tests</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">5</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Cross-contract scenarios</p>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded">
                  <h4 className="font-semibold mb-2">Fuzz Tests</h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">70</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Edge case exploration</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-4 rounded">
                <h4 className="font-semibold mb-2">Run All Tests:</h4>
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-x-auto text-sm">
                  cd cds-protocol/contracts && forge test -vv
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links Section */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-900 dark:to-purple-900 rounded-lg text-white">
          <h2 className="text-2xl font-bold mb-4">📚 Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://github.com/Aditya-alchemist/Credit-Default-Swaps"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition"
            >
              <ExternalLink size={18} />
              GitHub Repository
            </a>
            <a
              href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition"
            >
              <ExternalLink size={18} />
              Complete README
            </a>
            <a
              href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/tree/main/cds-protocol/contracts"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition"
            >
              <ExternalLink size={18} />
              Smart Contracts
            </a>
            <a
              href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/tree/main/cds-protocol/frontend"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition"
            >
              <ExternalLink size={18} />
              Frontend Code
            </a>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-12 p-6 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold mb-4">💬 Support & Community</h2>
          <div className="space-y-2 text-slate-700 dark:text-slate-300">
            <p>
              Found an issue? Please{' '}
              <a
                href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 inline-flex"
              >
                open an issue on GitHub <ExternalLink size={14} />
              </a>
            </p>
            <p>
              Want to contribute?{' '}
              <a
                href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/pulls"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 inline-flex"
              >
                Submit a pull request <ExternalLink size={14} />
              </a>
            </p>
            <p>
              Check the{' '}
              <a
                href="https://github.com/Aditya-alchemist/Credit-Default-Swaps/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 inline-flex"
              >
                GitHub Discussions <ExternalLink size={14} />
              </a>{' '}
              for questions and community chat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
