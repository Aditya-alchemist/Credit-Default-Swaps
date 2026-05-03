import React from "react";

type IconName =
  | "shield"
  | "dashboard"
  | "market"
  | "card"
  | "chart"
  | "alert"
  | "admin"
  | "docs"
  | "support"
  | "faucet"
  | "contracts"
  | "oracle"
  | "lock"
  | "coin"
  | "eth";

const svgByName: Record<IconName, string> = {
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="g" x1="8" x2="40" y1="6" y2="42" gradientUnits="userSpaceOnUse"><stop stop-color="#7dd3fc"/><stop offset=".55" stop-color="#2563eb"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs><path fill="url(#g)" d="M24 4 39 10v12c0 10-6.5 18.6-15 22-8.5-3.4-15-12-15-22V10l15-6Z"/><path fill="#fff" fill-opacity=".5" d="M24 8v31c6.5-3 11-9.6 11-17V13L24 8Z"/></svg>`,
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="7" y="9" width="14" height="13" rx="4" fill="#f97316"/><rect x="27" y="9" width="14" height="22" rx="4" fill="#2563eb"/><rect x="7" y="28" width="14" height="11" rx="4" fill="#10b981"/><rect x="27" y="35" width="14" height="4" rx="2" fill="#94a3b8"/></svg>`,
  market: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M8 34h32" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/><path d="m10 29 8-9 7 5 11-14" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="36" cy="11" r="5" fill="#f97316"/></svg>`,
  card: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="24" rx="5" fill="#0ea5e9"/><rect x="6" y="18" width="36" height="5" fill="#075985"/><rect x="12" y="28" width="12" height="4" rx="2" fill="#fff"/><rect x="29" y="28" width="7" height="4" rx="2" fill="#facc15"/></svg>`,
  chart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="9" y="25" width="6" height="14" rx="2" fill="#10b981"/><rect x="21" y="15" width="6" height="24" rx="2" fill="#f97316"/><rect x="33" y="8" width="6" height="31" rx="2" fill="#2563eb"/><path d="M7 40h34" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/></svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 6 44 41H4L24 6Z" fill="#f59e0b"/><path d="M24 17v11" stroke="#111827" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="35" r="2.5" fill="#111827"/></svg>`,
  admin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="7" fill="#fff"/><path fill="#f97316" d="m24 4 4 7 8-1 2 8 6 5-6 5-2 8-8-1-4 7-4-7-8 1-2-8-6-5 6-5 2-8 8 1 4-7Zm0 13a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/></svg>`,
  docs: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M12 7h18l6 6v28H12V7Z" fill="#e0f2fe"/><path d="M30 7v8h8" fill="#93c5fd"/><path d="M17 22h17M17 29h17M17 36h11" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/></svg>`,
  support: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#ec4899"/><path d="M17 20a7 7 0 0 1 14 0c0 6-7 5-7 11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="36" r="2.5" fill="#fff"/></svg>`,
  faucet: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M10 16h20v8H10z" fill="#2563eb"/><path d="M30 20h8v6h-8z" fill="#0f172a"/><path d="M18 24v8" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/><path d="M36 29c4 4 4 8 0 10-4-2-4-6 0-10Z" fill="#38bdf8"/></svg>`,
  contracts: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="10" y="7" width="28" height="34" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/><path d="M17 17h14M17 24h14M17 31h9" stroke="#f97316" stroke-width="3" stroke-linecap="round"/></svg>`,
  oracle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="23" r="13" fill="#7c3aed"/><circle cx="24" cy="23" r="6" fill="#f8fafc"/><path d="M16 39h16" stroke="#f97316" stroke-width="4" stroke-linecap="round"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="10" y="21" width="28" height="20" rx="4" fill="#f97316"/><path d="M16 21v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#0f172a" stroke-width="4"/><circle cx="24" cy="31" r="3" fill="#fff"/></svg>`,
  coin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="#16a34a"/><path d="M24 12v24M17 18h11a5 5 0 0 1 0 10H18" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  eth: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="m24 5 12 20-12 7-12-7L24 5Z" fill="#2563eb"/><path d="m24 43 12-15-12 7-12-7 12 15Z" fill="#0f172a"/></svg>`,
};

export const IconImage: React.FC<{ name: IconName; className?: string; alt?: string }> = ({
  name,
  className = "h-6 w-6",
  alt = "",
}) => (
  <img
    src={`data:image/svg+xml;utf8,${encodeURIComponent(svgByName[name])}`}
    className={className}
    alt={alt}
    loading="lazy"
  />
);

