import React, { useState } from "react";
import { AlertTriangle, RotateCcw, Smartphone, Clock, Trash2, X, Loader2 } from "lucide-react";
import { KeyItem } from "../types";

export type ActionType = "revoke" | "restore" | "resetDevice" | "extend" | "delete";

interface ActionDialogProps {
  isOpen: boolean;
  action: ActionType | null;
  keyItem: KeyItem | null;
  onClose: () => void;
  onConfirm: (action: ActionType, key: string, extraDays?: number) => Promise<void>;
}

export const ActionDialog: React.FC<ActionDialogProps> = ({
  isOpen,
  action,
  keyItem,
  onClose,
  onConfirm,
}) => {
  const [extendDays, setExtendDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !action || !keyItem) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(action, keyItem.key, action === "extend" ? extendDays : undefined);
      onClose();
    } catch {
      // Handled by caller toast
    } finally {
      setLoading(false);
    }
  };

  const getActionConfig = () => {
    switch (action) {
      case "revoke":
        return {
          title: "Revoke Product Key",
          description: `Are you sure you want to revoke key "${keyItem.formattedKey}"? The user will immediately be barred from using the app.`,
          icon: AlertTriangle,
          iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          btnColor: "bg-rose-600 hover:bg-rose-500 text-white",
          btnText: "Revoke Key",
        };
      case "restore":
        return {
          title: "Restore Product Key",
          description: `Restore key "${keyItem.formattedKey}" back to active or unused status?`,
          icon: RotateCcw,
          iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          btnColor: "bg-emerald-600 hover:bg-emerald-500 text-white",
          btnText: "Restore Key",
        };
      case "resetDevice":
        return {
          title: "Reset Device Binding",
          description: `Unbind key "${keyItem.formattedKey}" from its current device? Use this if the customer got a new phone, reinstalled the app, or lost their device. Remaining validity time will not be affected.`,
          icon: Smartphone,
          iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
          btnColor: "bg-sky-600 hover:bg-sky-500 text-white",
          btnText: "Reset Device",
        };
      case "extend":
        return {
          title: "Extend Key Duration",
          description: `Add additional validity days to key "${keyItem.formattedKey}".`,
          icon: Clock,
          iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          btnColor: "bg-amber-600 hover:bg-amber-500 text-white",
          btnText: "Extend Key",
        };
      case "delete":
        return {
          title: "Permanently Delete Key",
          description: `Are you sure you want to completely delete key "${keyItem.formattedKey}"? This action cannot be undone.`,
          icon: Trash2,
          iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          btnColor: "bg-rose-600 hover:bg-rose-500 text-white",
          btnText: "Delete Forever",
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-850/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${config.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100">{config.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">{config.description}</p>

          {action === "extend" && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Number of Days to Add
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500 font-semibold"
                required
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-slate-100 hover:bg-navy-800 rounded-xl border border-navy-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 ${config.btnColor}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{config.btnText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
