import React, { useState } from "react";
import { X, Copy, Check, Download, Sparkles, Loader2, KeyRound } from "lucide-react";
import { fnCreateKeys } from "../firebase";

interface CreateKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  showToast: (type: "success" | "error", message: string) => void;
}

const PRESET_DURATIONS = [
  { label: "1 Day", days: 1 },
  { label: "3 Days", days: 3 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
];

export const CreateKeysModal: React.FC<CreateKeysModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  showToast,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [customDays, setCustomDays] = useState<string>("14");
  const [count, setCount] = useState<number>(1);
  const [label, setLabel] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [createdKeys, setCreatedKeys] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  if (!isOpen) return null;

  const durationDays = isCustomDuration ? parseInt(customDays, 10) || 1 : selectedDuration;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (count < 1 || count > 100) {
      showToast("error", "Quantity must be between 1 and 100.");
      return;
    }
    if (durationDays < 1) {
      showToast("error", "Duration must be at least 1 day.");
      return;
    }

    setLoading(true);
    try {
      const res = await fnCreateKeys({
        durationDays,
        count,
        label: label.trim(),
      });
      const keys = res.data.keys;
      setCreatedKeys(keys);
      showToast("success", `Successfully generated ${keys.length} key(s)!`);
      onCreated();
    } catch (err: any) {
      showToast("error", err.message || "Failed to generate keys.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyAllKeys = async () => {
    await navigator.clipboard.writeText(createdKeys.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const downloadCSV = () => {
    const nowIso = new Date().toISOString();
    const rows = [
      ["Key", "DurationDays", "Label", "GeneratedAt"],
      ...createdKeys.map((k) => [k, durationDays.toString(), label.trim(), nowIso]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mlbb_keys_${durationDays}d_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setCreatedKeys([]);
    setLabel("");
    setCount(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-850/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gold-500/10 text-gold-400 rounded-lg border border-gold-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100">
                {createdKeys.length > 0 ? "Keys Created" : "Generate Product Keys"}
              </h3>
              <p className="text-xs text-slate-400">
                {createdKeys.length > 0
                  ? `${createdKeys.length} keys ready for distribution`
                  : "Create new subscription access keys"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {createdKeys.length > 0 ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={copyAllKeys}
                className="flex-1 py-2.5 px-4 bg-navy-800 hover:bg-navy-750 text-slate-100 text-sm font-semibold rounded-xl border border-navy-700 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedAll ? "All Copied!" : "Copy All Keys"}</span>
              </button>

              <button
                onClick={downloadCSV}
                className="flex-1 py-2.5 px-4 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV</span>
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {createdKeys.map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-navy-950/60 border border-navy-800 rounded-xl"
                >
                  <span className="font-mono text-sm tracking-wider text-gold-300 font-semibold">
                    {k}
                  </span>
                  <button
                    onClick={() => copyToClipboard(k)}
                    className="p-1.5 text-slate-400 hover:text-gold-400 hover:bg-navy-800 rounded-lg transition-colors"
                    title="Copy Key"
                  >
                    {copiedKey === k ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold text-sm rounded-xl transition-all hover:brightness-105 active:scale-98"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="p-6 space-y-5">
            {/* Duration Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Access Duration
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {PRESET_DURATIONS.map((preset) => {
                  const active = !isCustomDuration && selectedDuration === preset.days;
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        setIsCustomDuration(false);
                        setSelectedDuration(preset.days);
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        active
                          ? "bg-gold-500/15 border-gold-500 text-gold-400 shadow-sm"
                          : "bg-navy-800/80 border-navy-700 text-slate-300 hover:border-navy-600"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomDuration(!isCustomDuration)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    isCustomDuration
                      ? "bg-gold-500/15 border-gold-500 text-gold-400"
                      : "bg-navy-800/50 border-navy-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Custom days
                </button>
                {isCustomDuration && (
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="w-24 px-3 py-1 bg-navy-950 border border-navy-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-gold-500 font-semibold"
                    placeholder="Days"
                    required
                  />
                )}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Quantity (1 to 100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500 font-medium"
                required
              />
            </div>

            {/* Label / Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Buyer / Customer Label (Optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. John Doe / Discord buyer #42"
                className="w-full px-3.5 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500 placeholder:text-slate-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-bold text-sm rounded-xl shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating {count} Key(s)...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Generate {count} Key(s)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
