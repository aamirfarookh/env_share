"use client";

import { useState, useEffect, use } from "react";
import { Navbar } from "@/components/Navbar";
import { SecretViewer } from "@/components/SecretViewer";
import {
  importKeyFromUrlSafe,
  decryptSecret,
} from "@/lib/crypto";
import {
  Lock,
  Unlock,
  ShieldAlert,
  Flame,
  Clock,
  KeyRound,
  FileX,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SecretPageProps {
  params: Promise<{ id: string }>;
}

export default function SecretPage({ params }: SecretPageProps) {
  const resolvedParams = use(params);
  const secretId = resolvedParams.id;

  const [metadata, setMetadata] = useState<{
    exists: boolean;
    expiresAt: number;
    remainingViews: number;
    maxViews: number;
    hasPassword: boolean;
  } | null>(null);

  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Decryption state
  const [keyFromHash, setKeyFromHash] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [remainingViewsAfterReveal, setRemainingViewsAfterReveal] = useState<number | null>(null);

  // Read URL Hash key on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const match = hash.match(/#k=([^&]+)/);
      if (match && match[1]) {
        setKeyFromHash(match[1]);
      }
    }
  }, []);

  // Fetch metadata safely without burning
  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`/api/secrets/${secretId}`);
        if (!res.ok) {
          setMetaError("This secret does not exist, has expired, or has already been burned.");
          setMetadata(null);
          return;
        }
        const data = await res.json();
        setMetadata(data);
      } catch (err) {
        setMetaError("Network error while connecting to server.");
      } finally {
        setIsLoadingMeta(false);
      }
    }

    if (secretId) {
      fetchMeta();
    }
  }, [secretId]);

  const handleRevealAndDecrypt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDecryptionError(null);

    if (!keyFromHash) {
      setDecryptionError(
        "Missing decryption key in URL. Ensure you opened the full link including the '#k=...' portion."
      );
      return;
    }

    if (metadata?.hasPassword && !passphrase.trim()) {
      setDecryptionError("This secret is protected by a passphrase. Please enter it below.");
      return;
    }

    setIsDecrypting(true);

    try {
      // 1. Fetch ciphertext payload from server (burns/decrements view atomically)
      const res = await fetch(`/api/secrets/${secretId}/reveal`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "Secret could not be retrieved. It may have expired or already been burned."
        );
      }

      const payload = await res.json();
      setRemainingViewsAfterReveal(payload.remainingViews);

      // 2. Perform zero-knowledge client-side decryption
      const rawKeyBytes = importKeyFromUrlSafe(keyFromHash);
      const plaintext = await decryptSecret(
        {
          ciphertext: payload.ciphertext,
          iv: payload.iv,
          salt: payload.salt,
        },
        rawKeyBytes,
        metadata?.hasPassword ? passphrase : undefined
      );

      setDecryptedText(plaintext);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Decryption failed.";
      setDecryptionError(message);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Loading Metadata */}
        {isLoadingMeta && (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Verifying secret status...</p>
          </div>
        )}

        {/* Secret Expired or Not Found */}
        {!isLoadingMeta && (metaError || !metadata) && (
          <div className="p-8 max-w-lg mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mx-auto text-rose-400">
              <FileX className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Secret Unavailable</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {metaError || "This secret does not exist, has reached its view limit, or expired."}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Create a new secret</span>
              </Link>
            </div>
          </div>
        )}

        {/* Secret Found - Reveal Gate OR Decrypted Viewer */}
        {!isLoadingMeta && metadata && (
          <>
            {decryptedText ? (
              /* Decrypted Content Viewer */
              <SecretViewer
                decryptedText={decryptedText}
                remainingViews={
                  remainingViewsAfterReveal !== null
                    ? remainingViewsAfterReveal
                    : metadata.remainingViews
                }
                maxViews={metadata.maxViews}
                expiresAt={metadata.expiresAt}
              />
            ) : (
              /* Pre-Reveal Gate (Anti-Bot Unfurl Protection) */
              <div className="max-w-lg mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center mx-auto text-cyan-400 shadow-lg shadow-cyan-950/50">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Encrypted Secret Waiting
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Someone has securely shared environment credentials with you.
                  </p>
                </div>

                {/* Warnings / Metadata summary */}
                <div className="space-y-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center justify-between py-1 border-b border-slate-900">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      View Policy
                    </span>
                    <span className="font-semibold text-slate-200">
                      {metadata.remainingViews === 1
                        ? "1 view left (Burn after reading)"
                        : `${metadata.remainingViews} views left`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Auto-Expiry
                    </span>
                    <span className="font-semibold text-slate-200">
                      {new Date(metadata.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Missing hash warning */}
                {!keyFromHash && (
                  <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Missing decryption key in URL. Make sure the entire link including the <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">#k=...</code> portion was copied.
                    </span>
                  </div>
                )}

                {/* Error message */}
                {decryptionError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{decryptionError}</span>
                  </div>
                )}

                {/* Passphrase Input if required */}
                {metadata.hasPassword && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                      Enter Passphrase
                    </label>
                    <input
                      type="password"
                      placeholder="Passphrase provided by the sender..."
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                )}

                {/* Reveal & Decrypt Button */}
                <button
                  onClick={handleRevealAndDecrypt}
                  disabled={isDecrypting || !keyFromHash}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDecrypting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Decrypting in Browser...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Decrypt & View Secret</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 text-center">
                  Protected against Slack/Discord link crawlers. Clicking will consume 1 view.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
