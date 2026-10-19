import React, { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  FileImage,
  X,
} from "lucide-react";
import { fnGetAppIcon, fnUploadAppIcon } from "../firebase";
import { AppIcon } from "../types";

interface IconUploadSectionProps {
  showToast: (type: "success" | "error", message: string) => void;
}

const MAX_ICON_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (ms: number | null): string => {
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const IconUploadSection: React.FC<IconUploadSectionProps> = ({ showToast }) => {
  const [current, setCurrent] = useState<AppIcon | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState<boolean>(true);
  const [pending, setPending] = useState<{ file: File; base64: string } | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fnGetAppIcon();
        if (!cancelled) setCurrent(res.data.icon);
      } catch (err: any) {
        if (!cancelled) showToast("error", err.message || "Failed to load current icon.");
      } finally {
        if (!cancelled) setLoadingCurrent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const pickFile = (file?: File | null) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast("error", "Unsupported file type. Use PNG, JPG, WEBP, SVG or ICO.");
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      showToast("error", "Icon must be 4 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPending({ file, base64: result.substring(result.indexOf(",") + 1) });
    };
    reader.onerror = () => showToast("error", "Could not read the selected file.");
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!pending) return;
    setUploading(true);
    try {
      const res = await fnUploadAppIcon({
        fileName: pending.file.name,
        contentType: pending.file.type,
        data: pending.base64,
      });
      setCurrent(res.data.icon);
      setPending(null);
      showToast("success", current ? "App icon updated successfully!" : "App icon uploaded successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to upload icon.");
    } finally {
      setUploading(false);
    }
  };

  const previewSrc = pending
    ? `data:${pending.file.type};base64,${pending.base64}`
    : current?.url || null;

  return (
    <section className="bg-navy-900 border border-navy-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-850/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gold-500/10 text-gold-400 rounded-lg border border-gold-500/20">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">App Icon</h3>
            <p className="text-xs text-slate-400">
              Upload the app icon — re-upload anytime to replace it
            </p>
          </div>
        </div>
        {current && !pending && (
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Live
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 items-start">
        {/* Preview */}
        <div>
          <div className="w-32 h-32 mx-auto rounded-2xl bg-navy-950/70 border border-navy-800 flex items-center justify-center overflow-hidden">
            {loadingCurrent && !previewSrc ? (
              <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
            ) : previewSrc ? (
              <img
                src={previewSrc}
                alt="App icon preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-600" />
            )}
          </div>
          <p
            className="text-center text-[11px] text-slate-400 mt-2 truncate px-1"
            title={pending ? pending.file.name : current?.fileName || ""}
          >
            {pending
              ? pending.file.name
              : current
              ? current.fileName
              : loadingCurrent
              ? "Loading..."
              : "No icon set"}
          </p>
          {current && !pending && (
            <p className="text-center text-[11px] text-slate-600">
              {formatBytes(current.size)}
              {current.updatedAt ? ` · ${formatDate(current.updatedAt)}` : ""}
            </p>
          )}
        </div>

        {/* Dropzone & actions */}
        <div className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={`border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-gold-500 bg-gold-500/10"
                : "border-navy-700 bg-navy-950/40 hover:border-gold-500/50 hover:bg-navy-950/70"
            }`}
          >
            <UploadCloud
              className={`w-7 h-7 mx-auto mb-2 ${dragOver ? "text-gold-400" : "text-slate-500"}`}
            />
            <p className="text-sm text-slate-300">
              Drag &amp; drop an icon here, or{" "}
              <span className="text-gold-400 font-semibold">browse</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, WEBP, SVG or ICO · max 4 MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {pending && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-navy-950/60 border border-navy-800 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileImage className="w-4 h-4 text-gold-400 shrink-0" />
                <span className="text-sm text-slate-200 truncate">{pending.file.name}</span>
                <span className="text-xs text-slate-500 shrink-0">
                  {formatBytes(pending.file.size)}
                </span>
              </div>
              <button
                onClick={() => setPending(null)}
                disabled={uploading}
                className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                title="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={!pending || uploading}
              className="px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-bold text-sm rounded-xl shadow-md shadow-gold-500/20 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>{current ? "Update Icon" : "Upload Icon"}</span>
                </>
              )}
            </button>
            {pending && !uploading && (
              <button
                onClick={() => setPending(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-navy-700 hover:border-navy-600 rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
