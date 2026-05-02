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
  items: TxItem[];
};

const TxContext = createContext<TxContextType | undefined>(undefined);

export const TxProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<TxItem[]>([]);
  
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
    setItems((s) =>
      s.map((it) =>
        it.id === id
          ? {
              ...it,
              status: "success",
              message,
              txHash: options?.txHash,
              explorerUrl: options?.explorerUrl,
            }
          : it
      )
    );
    setTimeout(() => setItems((s) => s.filter((it) => it.id !== id)), 6000);
  };

  const notifyError = (id: number, message?: string) => {
    setItems((s) =>
      s.map((it) =>
        it.id === id ? { ...it, status: "error", message } : it
      )
    );
    setTimeout(() => setItems((s) => s.filter((it) => it.id !== id)), 8000);
  };

  return (
    <TxContext.Provider value={{ notifyPending, notifySuccess, notifyError, items }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {items.map((it) => (
          <div
            key={it.id}
            className={`max-w-sm w-full border rounded-lg px-4 py-3 shadow-lg flex flex-col gap-2 ${{
              pending: "bg-slate-800 text-white border-slate-600",
              success: "bg-green-700 text-white border-green-600",
              error: "bg-red-700 text-white border-red-600",
            }[it.status]}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium">{it.title}</div>
                {it.message && (
                  <div className="text-sm opacity-80 mt-1">{it.message}</div>
                )}
              </div>
              <div className="text-xs font-semibold self-start whitespace-nowrap ml-2">
                {it.status.toUpperCase()}
              </div>
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
                View on Explorer →
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
