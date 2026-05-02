import React from "react";

interface ConfirmTxModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  gasEstimate?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmTxModal: React.FC<ConfirmTxModalProps> = ({
  isOpen,
  title,
  message,
  gasEstimate,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        {message && <p className="text-sm text-slate-300 mb-4">{message}</p>}
        {gasEstimate && (
          <div className="bg-slate-800 rounded px-3 py-2 mb-4 text-xs text-slate-200">
            <div className="text-slate-400">Estimated Gas</div>
            <div className="font-mono text-sm">{gasEstimate}</div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded font-medium text-white text-sm transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium text-white text-sm transition flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="inline-block animate-spin">⏳</div>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmTxModal;
