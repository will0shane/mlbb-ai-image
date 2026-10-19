import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Filter,
  Smartphone,
  RotateCcw,
  AlertTriangle,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { KeyItem, DerivedStatus } from "../types";
import { ActionType } from "./ActionDialog";

interface KeyTableProps {
  keys: KeyItem[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onActionClick: (action: ActionType, item: KeyItem) => void;
  hasMore: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  pageIndex: number;
}

function formatTimeLeft(timeLeftMs: number | null, status: DerivedStatus): string {
  if (status === "revoked") return "Revoked";
  if (status === "unused") return "Not started";
  if (timeLeftMs === null || status === "expired" || timeLeftMs <= 0) return "Expired";

  const totalMinutes = Math.floor(timeLeftMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return `${days}d ${hours}h left`;
  }
  if (totalHours >= 1) {
    return `${totalHours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}

function formatDate(ms: number | null): string {
  if (!ms) return "-";
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(ms: number | null): string {
  if (!ms) return "Never";
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export const KeyTable: React.FC<KeyTableProps> = ({
  keys,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onActionClick,
  hasMore,
  onNextPage,
  onPrevPage,
  pageIndex,
}) => {
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleReveal = (keyId: string) => {
    setRevealedKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyKey = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getMaskedDisplay = (formatted: string, isRevealed: boolean) => {
    if (isRevealed) return formatted;
    // format is XXXX-XXXX-XXXX-XXXX
    const parts = formatted.split("-");
    if (parts.length === 4) {
      return `${parts[0]}-****-****-${parts[3]}`;
    }
    return "****";
  };

  const getStatusBadge = (status: DerivedStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Active
          </span>
        );
      case "available":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30" title="Active subscription, no device currently bound">
            Available
          </span>
        );
      case "unused":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            Unused
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Expired
          </span>
        );
      case "revoked":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/50">
            Revoked
          </span>
        );
    }
  };

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Controls: Search & Filter */}
      <div className="p-4 sm:p-5 border-b border-navy-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-navy-850/40">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by key or label..."
            className="w-full pl-10 pr-4 py-2 bg-navy-950 border border-navy-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-gold-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="pl-9 pr-8 py-2 bg-navy-950 border border-navy-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-gold-500 appearance-none font-medium cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="unused">Unused</option>
              <option value="active">Active</option>
              <option value="available">Available (Unbound)</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-navy-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-navy-800">
            <tr>
              <th className="px-5 py-3.5">Product Key</th>
              <th className="px-4 py-3.5">Label</th>
              <th className="px-4 py-3.5">Duration</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Activated</th>
              <th className="px-4 py-3.5">Expires</th>
              <th className="px-4 py-3.5">Time Left</th>
              <th className="px-4 py-3.5 text-center">Device</th>
              <th className="px-4 py-3.5">Last Seen</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800/60 font-medium">
            {loading && keys.length === 0 ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 w-36 bg-navy-800 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-navy-800 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-12 bg-navy-800 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-6 w-16 bg-navy-800 rounded-full" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-navy-800 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-navy-800 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-20 bg-navy-800 rounded" /></td>
                  <td className="px-4 py-4 text-center"><div className="h-4 w-8 mx-auto bg-navy-800 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-navy-800 rounded" /></td>
                  <td className="px-5 py-4 text-right"><div className="h-8 w-20 ml-auto bg-navy-800 rounded" /></td>
                </tr>
              ))
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                  <ShieldAlert className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">No product keys found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting your filters or generate a new batch of keys above.
                  </p>
                </td>
              </tr>
            ) : (
              keys.map((item) => {
                const isRevealed = !!revealedKeys[item.key];
                return (
                  <tr
                    key={item.key}
                    className="hover:bg-navy-850/50 transition-colors group"
                  >
                    {/* Key */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200 tracking-wider">
                          {getMaskedDisplay(item.formattedKey, isRevealed)}
                        </span>
                        <button
                          onClick={() => toggleReveal(item.key)}
                          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                          title={isRevealed ? "Hide Key" : "Reveal Key"}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => copyKey(item.formattedKey)}
                          className="p-1 text-slate-400 hover:text-gold-400 transition-colors"
                          title="Copy Full Key"
                        >
                          {copiedKey === item.formattedKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Label */}
                    <td className="px-4 py-4 whitespace-nowrap text-slate-300">
                      {item.label || <span className="text-slate-600 italic">None</span>}
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-4 whitespace-nowrap text-slate-300">
                      {item.durationDays}d
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Activated */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-400">
                      {formatDate(item.activatedAt)}
                    </td>

                    {/* Expires */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-400">
                      {formatDate(item.expiresAt)}
                    </td>

                    {/* Time Left */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold">
                      <span
                        className={
                          item.status === "active"
                            ? "text-emerald-400"
                            : item.status === "expired"
                            ? "text-rose-400"
                            : "text-slate-400"
                        }
                      >
                        {formatTimeLeft(item.timeLeftMs, item.status)}
                      </span>
                    </td>

                    {/* Device Bound */}
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {item.deviceBound ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <Smartphone className="w-3 h-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">No</span>
                      )}
                    </td>

                    {/* Last Seen */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-400">
                      {formatRelativeTime(item.lastSeenAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === "revoked" ? (
                          <button
                            onClick={() => onActionClick("restore", item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Restore Key"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onActionClick("revoke", item)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Revoke Key"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onActionClick("resetDevice", item)}
                          disabled={!item.deviceBound}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title="Reset Device Binding"
                        >
                          <Smartphone className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onActionClick("extend", item)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Extend Duration"
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onActionClick("delete", item)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3 border-t border-navy-800 bg-navy-950/60 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Showing {keys.length} keys {pageIndex > 0 ? `(Page ${pageIndex + 1})` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevPage}
            disabled={pageIndex === 0 || loading}
            className="p-2 text-slate-400 hover:text-slate-100 disabled:opacity-30 rounded-lg border border-navy-800 bg-navy-900 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNextPage}
            disabled={!hasMore || loading}
            className="p-2 text-slate-400 hover:text-slate-100 disabled:opacity-30 rounded-lg border border-navy-800 bg-navy-900 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
