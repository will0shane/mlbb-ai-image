import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { ToastMessage } from "../types";

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-slide-in ${
              isSuccess
                ? "bg-navy-850/90 border-emerald-500/40 text-emerald-300"
                : isError
                ? "bg-navy-850/90 border-rose-500/40 text-rose-300"
                : "bg-navy-850/90 border-sky-500/40 text-sky-300"
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-400 shrink-0" />}
            {isError && <AlertCircle className="w-5 h-5 mt-0.5 text-rose-400 shrink-0" />}
            {!isSuccess && !isError && <Info className="w-5 h-5 mt-0.5 text-sky-400 shrink-0" />}

            <div className="flex-1 text-sm text-slate-200 font-medium break-words">
              {toast.message}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-100 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
