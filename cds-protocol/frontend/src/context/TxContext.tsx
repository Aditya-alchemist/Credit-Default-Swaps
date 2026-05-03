import React, { createContext, useContext, useState, ReactNode } from "react";

type TxStatus = "pending" | "success" | "error";

type TxItem = {
  id: number;
  title: string;
  status: TxStatus;
  message?: string;
  gasEstimate?: string;
  txHash?: string;
  explorerUrl?: string;
};

type TxContextType = {
  notifyPending: (
    title: string,
    options?: { gasEstimate?: string }
  ) => number;
  notifySuccess: (
    id: number,
    message?: string,
    options?: { txHash?: string; explorerUrl?: string }
  ) => void;
  notifyError: (id: number, message?: string) => void;
  dismiss: (id: number) => void;
  items: TxItem[];
};

const TxContext = createContext<TxContextType | undefined>(undefined);

export const TxProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<TxItem[]>([]);

  const dismiss = (id: number) => {
    setItems((s) => s.filter((it) => it.id !== id));
  };
  
  const notifyPending = (
    title: string,
    options?: { gasEstimate?: string }
  ) => {
    const id = Date.now();
    setItems((s) => [
      {
        id,
        title,
        status: "pending",
        gasEstimate: options?.gasEstimate,
      },
      ...s,
    ]);
    return id;
  };

  const notifySuccess = (
    id: number,
    message?: string,
    options?: { txHash?: string; explorerUrl?: string }
  ) => {
    let resolvedId = id;
    setItems((s) => {
      const targetId = s.some((it) => it.id === id)
        ? id
        : s.find((it) => it.status === "pending")?.id ?? id;
      resolvedId = targetId;
      return s.map((it) =>
        it.id === targetId
          ? {
              ...it,
              id: targetId,
              status: "success",
              message,
              txHash: options?.txHash,
              explorerUrl: options?.explorerUrl,
            }
          : it
      );
    });
    setTimeout(() => setItems((s) => s.filter((it) => it.id !== resolvedId)), 6000);
  };

  const notifyError = (id: number, message?: string) => {
    let resolvedId = id;
    setItems((s) => {
      const targetId = s.some((it) => it.id === id)
        ? id
        : s.find((it) => it.status === "pending")?.id ?? id;
      resolvedId = targetId;

      if (!s.some((it) => it.id === targetId)) {
        return [{ id: targetId, title: "Transaction failed", status: "error", message }, ...s];
      }

      return s.map((it) =>
        it.id === targetId ? { ...it, status: "error", message } : it
      );
    });
    setTimeout(() => setItems((s) => s.filter((it) => it.id !== resolvedId)), 8000);
  };

  return (
    <TxContext.Provider value={{ notifyPending, notifySuccess, notifyError, dismiss, items }}>
      {children}
      <div className="fixed right-4 top-20 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
        {items.map((it) => (
          <div
            key={it.id}
            className={`w-full overflow-hidden rounded-lg border px-4 py-3 shadow-xl backdrop-blur flex flex-col gap-2 ${{
              pending: "bg-slate-900 text-white border-slate-700",
              success: "bg-emerald-700 text-white border-emerald-600",
              error: "bg-red-700 text-white border-red-600",
            }[it.status]}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${
                it.status === "pending" ? "bg-amber-400" : it.status === "success" ? "bg-emerald-300" : "bg-red-200"
              }`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{it.title}</div>
                {it.message && (
                  <div className="text-xs opacity-80 mt-1 leading-relaxed">{it.message}</div>
                )}
              </div>
              <div className="text-[10px] font-semibold self-start whitespace-nowrap rounded-full bg-white/10 px-2 py-1">
                {it.status.toUpperCase()}
              </div>
              <button
                type="button"
                onClick={() => dismiss(it.id)}
                className="rounded p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
            {it.gasEstimate && (
              <div className="text-xs opacity-75">Gas: {it.gasEstimate}</div>
            )}
            {it.explorerUrl && (
              <a
                href={it.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline hover:opacity-80"
              >
                View on Explorer -&gt;
              </a>
            )}
          </div>
        ))}
      </div>
    </TxContext.Provider>
  );
};

export const useTx = () => {
  const ctx = useContext(TxContext);
  if (!ctx) throw new Error("useTx must be used within TxProvider");
  return ctx;
};

export default TxContext;
