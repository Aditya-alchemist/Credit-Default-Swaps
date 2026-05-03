import React, { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

type FlowNode = {
  label: string;
  tone: string;
  x: number;
  y: number;
};

type FlowEdge = {
  from: number;
  to: number;
  label?: string;
};

const architectureNodes: FlowNode[] = [
  { label: "Protection Buyer", tone: "#3b82f6", x: 40, y: 55 },
  { label: "CDS Vault", tone: "#f97316", x: 285, y: 55 },
  { label: "Protection Seller", tone: "#10b981", x: 40, y: 185 },
  { label: "Margin Engine", tone: "#ef4444", x: 530, y: 22 },
  { label: "Premium Engine", tone: "#eab308", x: 530, y: 105 },
  { label: "Settlement Engine", tone: "#8b5cf6", x: 530, y: 188 },
  { label: "Credit Oracle", tone: "#06b6d4", x: 760, y: 22 },
  { label: "Keeper Bot", tone: "#ec4899", x: 760, y: 145 },
  { label: "React Frontend", tone: "#64748b", x: 285, y: 232 },
];

const architectureEdges: FlowEdge[] = [
  { from: 0, to: 1, label: "premium" },
  { from: 2, to: 1, label: "collateral" },
  { from: 1, to: 3, label: "ratio" },
  { from: 1, to: 4, label: "payments" },
  { from: 1, to: 5, label: "default" },
  { from: 3, to: 6, label: "score" },
  { from: 7, to: 6, label: "updates" },
  { from: 8, to: 1, label: "reads/writes" },
];

const marginNodes: FlowNode[] = [
  { label: "Ratio below 120%", tone: "#ef4444", x: 36, y: 94 },
  { label: "Margin Call", tone: "#f97316", x: 250, y: 94 },
  { label: "4 Hour Window", tone: "#eab308", x: 468, y: 94 },
  { label: "Top Up", tone: "#22c55e", x: 686, y: 34 },
  { label: "Position Saved", tone: "#10b981", x: 884, y: 34 },
  { label: "Liquidation", tone: "#8b5cf6", x: 686, y: 154 },
  { label: "Settlement Ready", tone: "#06b6d4", x: 884, y: 154 },
];

const marginEdges: FlowEdge[] = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 3, label: "seller acts" },
  { from: 3, to: 4 },
  { from: 2, to: 5, label: "expires" },
  { from: 5, to: 6 },
];

const timelineNodes: FlowNode[] = [
  { label: "Day 0\nPosition Opens", tone: "#3b82f6", x: 40, y: 94 },
  { label: "Day 90\nPremium Due", tone: "#f97316", x: 270, y: 94 },
  { label: "Day 90-113\nGrace Period", tone: "#eab308", x: 500, y: 94 },
  { label: "Day 114\nMissed", tone: "#ef4444", x: 730, y: 94 },
  { label: "Day 115+\nMargin Check", tone: "#8b5cf6", x: 920, y: 94 },
];

const timelineEdges: FlowEdge[] = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
];

const FlowDiagram = ({
  title,
  nodes,
  edges,
  height = 330,
}: {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  height?: number;
}) => {
  const [copied, setCopied] = useState(false);
  const text = nodes.map((node) => node.label.replace("\n", " ")).join(" -> ");

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-2xl shadow-blue-950/20">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/15"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl bg-slate-900/80 p-4 ring-1 ring-white/10">
        <svg viewBox="0 0 1080 300" height={height} className="min-w-[900px] w-full">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
            </marker>
            <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {edges.map((edge, index) => {
            const from = nodes[edge.from];
            const to = nodes[edge.to];
            const x1 = from.x + 150;
            const y1 = from.y + 28;
            const x2 = to.x;
            const y2 = to.y + 28;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.5"
                  markerEnd="url(#arrow)"
                />
                {edge.label && (
                  <text x={midX - 26} y={midY - 8} fill="#bfdbfe" fontSize="13" fontWeight="600">
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
          {nodes.map((node) => (
            <g key={node.label} filter="url(#glow)">
              <rect
                x={node.x}
                y={node.y}
                width="150"
                height="56"
                rx="16"
                fill="#111827"
                stroke={node.tone}
                strokeWidth="2"
              />
              <circle cx={node.x + 20} cy={node.y + 28} r="7" fill={node.tone} />
              {node.label.split("\n").map((line, index) => (
                <text
                  key={line}
                  x={node.x + 38}
                  y={node.y + (node.label.includes("\n") ? 22 + index * 18 : 33)}
                  fill="#f8fafc"
                  fontSize="14"
                  fontWeight="700"
                >
                  {line}
                </text>
              ))}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const CodeLine = ({ children }: { children: React.ReactNode }) => (
  <code className="block overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-cyan-100 shadow-inner">
    {children}
  </code>
);

const Documentation = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    architecture: true,
    formulas: true,
    margin: false,
    premium: false,
    bot: false,
    testing: false,
  });

  useEffect(() => {
    if (window.location.hash === "#support") {
      document.getElementById("support")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const panelClass = isDark
    ? "border-slate-800 bg-slate-900/80 text-slate-100"
    : "border-slate-200 bg-white text-slate-900";
  const mutedText = isDark ? "text-slate-300" : "text-slate-600";

  const Section = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="mb-5">
      <button
        onClick={() => toggleSection(id)}
        className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left font-semibold transition ${panelClass} hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-950/10`}
      >
        <span className="text-xl">{title}</span>
        <span className="text-blue-400">{expandedSections[id] ? "▼" : "▶"}</span>
      </button>
      {expandedSections[id] && (
        <div className={`mt-3 rounded-2xl border p-5 ${panelClass}`}>{children}</div>
      )}
    </section>
  );

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="lg:ml-64 px-4 pb-14 pt-24 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 text-white shadow-2xl shadow-blue-950/30">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Protocol Docs</p>
          <h1 className="mt-3 text-4xl font-black">CDS Protocol Documentation</h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-300">
            Architecture, risk math, automation flows, and operational links for the Credit Default Swaps protocol.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://github.com/Aditya-alchemist/Credit-Default-Swaps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              <ExternalLink size={18} />
              GitHub Repository
            </a>
            <a
              href="#support"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/15"
            >
              Support
            </a>
          </div>
        </div>

        <Section id="architecture" title="System Architecture">
          <p className={`mb-5 ${mutedText}`}>
            The protocol coordinates capital, credit data, margin checks, and settlement through a compact set of on-chain engines.
          </p>
          <FlowDiagram title="CDS Protocol Architecture" nodes={architectureNodes} edges={architectureEdges} />
        </Section>

        <Section id="formulas" title="Core Financial Formulas">
          <div className="grid gap-4">
            {[
              ["Premium Calculation", "Premium = (Notional x Spread bps x Days Elapsed) / (10,000 x 360)", "Quarterly payment owed by the protection buyer."],
              ["PV01", "PV01 = (Notional x Days Remaining) / (10,000 x 360)", "Dollar value change for every 1 basis point movement in spreads."],
              ["Mark-to-Market Loss", "MtM Loss = ((Current Spread - Entry Spread) x PV01) / 10,000", "Unrealized loss for the seller when spreads widen."],
              ["Collateral Ratio", "Collateral Ratio bps = (Collateral x 10,000) / (Notional + MtM Loss)", "Falls below 12,000 bps and the margin process begins."],
              ["Settlement Payout", "Payout = (Notional x (10,000 - Recovery Rate bps)) / 10,000", "Buyer payout after a declared default."],
              ["Health Factor", "Health Factor = (Collateral x Collateral Factor bps) / Total Debt Owed", "Borrowing safety score for lending positions."],
            ].map(([title, formula, detail]) => (
              <div key={title} className="rounded-2xl border border-slate-800/70 bg-slate-950/80 p-4">
                <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
                <CodeLine>{formula}</CodeLine>
                <p className="mt-2 text-sm text-cyan-100">{detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="margin" title="Margin Call Process">
          <p className={`mb-5 ${mutedText}`}>
            Sellers get a fixed response window after collateral quality deteriorates. If no top-up arrives, liquidation moves the position toward settlement.
          </p>
          <FlowDiagram title="Margin Call Liquidation Flow" nodes={marginNodes} edges={marginEdges} height={260} />
        </Section>

        <Section id="premium" title="Premium Payment Timeline">
          <p className={`mb-5 ${mutedText}`}>
            Premiums are scheduled quarterly, with a grace period before missed-payment automation escalates the position.
          </p>
          <FlowDiagram title="Premium Collection Timeline" nodes={timelineNodes} edges={timelineEdges} height={230} />
        </Section>

        <Section id="bot" title="Keeper Bot Jobs">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Check Margins", "Scans active positions and flags ratios below the protocol threshold."],
              ["Liquidate Expired Calls", "Executes liquidation after the margin-call response window expires."],
              ["Push Oracle Updates", "Refreshes stale credit data and spreads for referenced entities."],
              ["Check Missed Premiums", "Detects overdue premium payments and logs escalation candidates."],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-lg font-bold text-blue-300">{title}</h3>
                <p className="mt-2 text-sm text-slate-300">{detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="testing" title="Test Suite">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Unit Tests", "17", "Individual contract behavior"],
              ["Integration Tests", "5", "Cross-contract scenarios"],
              ["Fuzz Tests", "70", "Invariant and edge case exploration"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl bg-slate-950/80 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-3 text-4xl font-black text-emerald-400">{value}</p>
                <p className="mt-2 text-sm text-slate-300">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-blue-500/40 bg-blue-950/50 p-5">
            <p className="mb-3 font-semibold text-blue-100">Run all tests</p>
            <CodeLine>cd cds-protocol/contracts && forge test -vv</CodeLine>
          </div>
        </Section>

        <div className="mt-10 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-700 p-7 text-white shadow-xl shadow-blue-950/20">
          <h2 className="text-2xl font-black">Quick Links</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["GitHub Repository", "https://github.com/Aditya-alchemist/Credit-Default-Swaps"],
              ["Complete README", "https://github.com/Aditya-alchemist/Credit-Default-Swaps/blob/main/README.md"],
              ["Smart Contracts", "https://github.com/Aditya-alchemist/Credit-Default-Swaps/tree/main/cds-protocol/contracts"],
              ["Frontend Code", "https://github.com/Aditya-alchemist/Credit-Default-Swaps/tree/main/cds-protocol/frontend"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-4 font-semibold transition hover:bg-white/25"
              >
                <ExternalLink size={18} />
                {label}
              </a>
            ))}
          </div>
        </div>

        <section
          id="support"
          className="mt-10 scroll-mt-24 rounded-3xl border border-slate-800 bg-slate-950 p-7 text-white shadow-xl shadow-slate-950/20"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-300">Support</p>
          <h2 className="mt-2 text-2xl font-black">Need help or want to contribute?</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Open Issue", "Report bugs or broken docs.", "https://github.com/Aditya-alchemist/Credit-Default-Swaps/issues"],
              ["Pull Request", "Send fixes and improvements.", "https://github.com/Aditya-alchemist/Credit-Default-Swaps/pulls"],
              ["Discussions", "Ask questions and compare ideas.", "https://github.com/Aditya-alchemist/Credit-Default-Swaps/discussions"],
            ].map(([label, detail, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-pink-400/70 hover:bg-white/10"
              >
                <span className="inline-flex items-center gap-2 font-bold">
                  {label} <ExternalLink size={16} />
                </span>
                <p className="mt-2 text-sm text-slate-300">{detail}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Documentation;
