import React from "react";
import { KeyRound, Zap, Clock, PackageCheck } from "lucide-react";
import { SummaryStats } from "../types";

interface SummaryCardsProps {
  stats: SummaryStats;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats, loading }) => {
  const cards = [
    {
      title: "Total Keys",
      value: stats.total,
      icon: KeyRound,
      color: "text-slate-300",
      border: "border-slate-800",
      bg: "bg-navy-900/60",
      iconBg: "bg-slate-800/80 text-slate-300",
    },
    {
      title: "Active Now",
      value: stats.active,
      icon: Zap,
      color: "text-emerald-400",
      border: "border-emerald-500/20",
      bg: "bg-emerald-950/20",
      iconBg: "bg-emerald-500/10 text-emerald-400",
    },
    {
      title: "Expiring in 3 Days",
      value: stats.expiringSoon,
      icon: Clock,
      color: "text-amber-400",
      border: "border-amber-500/20",
      bg: "bg-amber-950/20",
      iconBg: "bg-amber-500/10 text-amber-400",
    },
    {
      title: "Unused Keys",
      value: stats.unused,
      icon: PackageCheck,
      color: "text-sky-400",
      border: "border-sky-500/20",
      bg: "bg-sky-950/20",
      iconBg: "bg-sky-500/10 text-sky-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className={`p-5 rounded-2xl border ${c.border} ${c.bg} backdrop-blur-sm transition-all hover:border-navy-700`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {c.title}
              </span>
              <div className={`p-2 rounded-xl ${c.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              {loading ? (
                <div className="h-8 w-16 bg-navy-800 rounded animate-pulse" />
              ) : (
                <span className={`text-3xl font-extrabold tracking-tight ${c.color}`}>
                  {c.value.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
