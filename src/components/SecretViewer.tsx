"use client";

import { useState, useMemo, useEffect } from "react";
import { parseEnv, generateEnvExample, EnvPair } from "@/lib/envParser";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  Flame,
  Clock,
  ShieldCheck,
  FileText,
  Table as TableIcon,
  Sparkles,
} from "lucide-react";

interface SecretViewerProps {
  decryptedText: string;
  remainingViews: number;
  maxViews: number;
  expiresAt: number;
}

export function SecretViewer({
  decryptedText,
  remainingViews,
  maxViews,
  expiresAt,
}: SecretViewerProps) {
  const [tab, setTab] = useState<"table" | "raw">("table");
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const parsed = useMemo(() => parseEnv(decryptedText), [decryptedText]);

  // Format remaining time countdown
  useEffect(() => {
    const updateCountdown = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;

      if (hours > 0) {
        setTimeLeft(`${hours}h ${remMins}m`);
      } else {
        setTimeLeft(`${remMins}m ${secs}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const toggleRevealKey = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const revealAll = () => {
    const all = new Set(parsed.pairs.map((p) => p.key));
    setRevealedKeys(all);
  };

  const maskAll = () => {
    setRevealedKeys(new Set());
  };

  const copyToClipboard = (text: string, identifier?: string) => {
    navigator.clipboard.writeText(text);
    if (identifier) {
      setCopiedKey(identifier);
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isAllRevealed =
    parsed.pairs.length > 0 &&
    revealedKeys.size === parsed.pairs.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Destruction / Burn banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-900/40 border border-cyan-700/50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              Decrypted Successfully
              <span className="text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
                AES-256-GCM
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Data was decrypted in your browser. Decryption key never touched the server.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {remainingViews === 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold">
              <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Burned from Server</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-semibold">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>
                {remainingViews} {remainingViews === 1 ? "view" : "views"} left
              </span>
            </div>
          )}

          {timeLeft && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{timeLeft}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Secret Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTab("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === "table"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table View ({parsed.pairs.length})
            </button>
            <button
              onClick={() => setTab("raw")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === "raw"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Raw .env
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tab === "table" && (
              <button
                onClick={isAllRevealed ? maskAll : revealAll}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                {isAllRevealed ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mask All</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reveal All</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => copyToClipboard(decryptedText)}
              className="flex items-center gap-1.5 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 hover:text-cyan-200 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied .env!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Entire .env</span>
                </>
              )}
            </button>

            <button
              onClick={() => downloadFile(".env", decryptedText)}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              title="Download as .env file"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download .env</span>
            </button>

            {parsed.pairs.length > 0 && (
              <button
                onClick={() => {
                  const example = generateEnvExample(decryptedText);
                  downloadFile(".env.example", example);
                }}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                title="Download .env.example with stripped values"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>.example</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Content */}
        {tab === "table" ? (
          <div className="overflow-x-auto">
            {parsed.pairs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No environment variables detected in the decrypted secret. Switch to Raw tab to inspect.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-3 px-4 w-12 text-slate-600 font-mono">#</th>
                    <th className="py-3 px-4 font-mono text-cyan-400 font-semibold">
                      VARIABLE KEY
                    </th>
                    <th className="py-3 px-4 font-mono">VALUE (MASKED BY DEFAULT)</th>
                    <th className="py-3 px-4 text-right w-28">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {parsed.pairs.map((p, idx) => {
                    const isRevealed = revealedKeys.has(p.key);
                    const isCopied = copiedKey === p.key;

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {p.lineNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-100 font-semibold tracking-wide">
                          {p.key}
                          {p.comment && (
                            <span className="block text-[10px] text-slate-500 font-sans italic font-normal mt-0.5">
                              #{p.comment}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 max-w-md break-all">
                          {isRevealed ? (
                            <span className="bg-emerald-950/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">
                              {p.value}
                            </span>
                          ) : (
                            <span className="text-slate-600 select-none tracking-widest text-sm">
                              ••••••••••••••••
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleRevealKey(p.key)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title={isRevealed ? "Mask value" : "Reveal value"}
                            >
                              {isRevealed ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(p.value, p.key)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title="Copy value"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Raw Text View */
          <div className="relative p-4 bg-slate-950/90 font-mono text-xs leading-relaxed overflow-x-auto">
            <pre className="text-slate-200 select-all whitespace-pre-wrap break-all">
              {decryptedText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
