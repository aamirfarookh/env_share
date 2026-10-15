"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { EnvEditor } from "@/components/EnvEditor";
import {
  generateRandomKey,
  exportKeyToUrlSafe,
  encryptSecret,
} from "@/lib/crypto";
import {
  Lock,
  ShieldAlert,
  Flame,
  Clock,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  const [envContent, setEnvContent] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(3600); // 1 hour default
  const [maxViews, setMaxViews] = useState(1); // 1 view burn-after-reading default
  const [enablePassword, setEnablePassword] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [createdSecret, setCreatedSecret] = useState<{
    id: string;
    shareUrl: string;
    deletionToken: string;
    deleteUrl: string;
    expiresAt: number;
    hasPassword: boolean;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDeleteLink, setCopiedDeleteLink] = useState(false);

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!envContent.trim()) {
      setErrorMessage("Please enter or paste your .env secrets first.");
      return;
    }

    if (enablePassword && !passphrase.trim()) {
      setErrorMessage("Please enter a passphrase or uncheck password protection.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Generate 256-bit AES-GCM key client-side
      const rawKeyBytes = generateRandomKey();
      const urlKey = exportKeyToUrlSafe(rawKeyBytes);

      // 2. Encrypt locally in browser
      const encrypted = await encryptSecret(
        envContent,
        rawKeyBytes,
        enablePassword ? passphrase : undefined
      );

      // 3. Post only ciphertext and IV to server (KEY IS NEVER SENT!)
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: encrypted.salt,
          hasPassword: encrypted.hasPassword,
          ttlSeconds,
          maxViews,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create secret.");
      }

      const data = await res.json();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${origin}/secret/${data.id}#k=${urlKey}`;
      const deleteUrl = `${origin}/delete/${data.id}?token=${data.deletionToken}`;

      setCreatedSecret({
        id: data.id,
        shareUrl,
        deletionToken: data.deletionToken,
        deleteUrl,
        expiresAt: data.expiresAt,
        hasPassword: encrypted.hasPassword,
      });

      // Clear the raw content from memory for privacy
      setEnvContent("");
      setPassphrase("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Encryption or network error occurred.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "share" | "delete") => {
    navigator.clipboard.writeText(text);
    if (type === "share") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedDeleteLink(true);
      setTimeout(() => setCopiedDeleteLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        {!createdSecret && (
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-Knowledge Client-Side Encryption</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Share .env Secrets Securely
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Encrypted in your browser with AES-256-GCM. The decryption key lives
              strictly in the URL fragment (<code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">#key</code>)
              and is <strong>never transmitted</strong> to the server.
            </p>
          </div>
        )}

        {/* Success / Created View */}
        {createdSecret ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/50">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Secret Encrypted & Ready to Share!
                  </h2>
                  <p className="text-xs text-slate-400">
                    The link contains the decryption key after the <code className="text-cyan-300 font-mono">#</code>. Send this link to the recipient.
                  </p>
                </div>
              </div>

              {/* Shareable Link Box */}
              <div className="space-y-2 mt-5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Shareable One-Time Link
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={createdSecret.shareUrl}
                    className="flex-1 bg-transparent text-xs font-mono text-cyan-300 px-2 focus:outline-none truncate select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(createdSecret.shareUrl, "share")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-cyan-500/20 shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Secret Policy Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Limit: {maxViews} {maxViews === 1 ? "view (Burn-after-reading)" : "views"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auto-destructs when timer expires</span>
                </div>
                {createdSecret.hasPassword && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Passphrase Protected</span>
                  </div>
                )}
              </div>

              {/* Sender Kill Switch */}
              <div className="mt-6 p-4 rounded-xl bg-rose-950/20 border border-rose-900/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                      Sender&apos;s Private Kill Switch
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Made a mistake? You can burn this secret immediately before anyone reads it.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(createdSecret.deleteUrl, "delete")}
                      className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {copiedDeleteLink ? "Copied Kill Link!" : "Copy Kill Link"}
                    </button>
                    <a
                      href={createdSecret.deleteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 text-rose-300 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Burn Secret Now
                    </a>
                  </div>
                </div>
              </div>

              {/* Create another button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setCreatedSecret(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-white hover:underline flex items-center gap-1"
                >
                  <span>Share another secret</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form Section */
          <form
            onSubmit={handleCreateSecret}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-6"
          >
            {errorMessage && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* .env Input & Visualizer */}
            <EnvEditor value={envContent} onChange={setEnvContent} />

            {/* Secret Expiry & Access Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              {/* Expiry Timer (TTL) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Self-Destruct Timer (TTL)
                </label>
                <select
                  value={ttlSeconds}
                  onChange={(e) => setTtlSeconds(Number(e.target.value))}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value={300}>5 Minutes</option>
                  <option value={3600}>1 Hour (Recommended)</option>
                  <option value={86400}>24 Hours</option>
                  <option value={604800}>7 Days</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Data is permanently expunged once time elapses.
                </p>
              </div>

              {/* View Limits */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Maximum Views
                </label>
                <select
                  value={maxViews}
                  onChange={(e) => setMaxViews(Number(e.target.value))}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value={1}>1 View (Burn after reading - Recommended)</option>
                  <option value={3}>3 Views</option>
                  <option value={5}>5 Views</option>
                  <option value={10}>10 Views</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Protected against Slack/Discord link preview bots.
                </p>
              </div>
            </div>

            {/* Optional Passphrase Protection */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">
                      Require Passphrase (Optional Second-Factor)
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Recipient must supply this passphrase to decrypt the secrets.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="enablePassword"
                  checked={enablePassword}
                  onChange={(e) => setEnablePassword(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900 cursor-pointer"
                />
              </div>

              {enablePassword && (
                <div className="pt-2 animate-in fade-in duration-150">
                  <input
                    type="password"
                    placeholder="Enter a strong passphrase..."
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tip: Share the link on Slack, and send the passphrase via Signal or SMS.
                  </p>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isLoading || !envContent.trim()}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Encrypting Client-Side...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Encrypt & Generate Secure Link</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>
          EnvShare • Zero-Knowledge End-to-End Encrypted Secret Sharing • Keys never leave your browser
        </p>
      </footer>
    </div>
  );
}
