"use client";

import { useState, useEffect, use } from "react";
import { Navbar } from "@/components/Navbar";
import { Trash2, Flame, Check, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface DeletePageProps {
  params: Promise<{ id: string }>;
}

export default function DeleteSecretPage({ params }: DeletePageProps) {
  const resolvedParams = use(params);
  const secretId = resolvedParams.id;

  const [token, setToken] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get("token");
      if (tokenParam) {
        setToken(tokenParam);
      }
    }
  }, []);

  const handleDelete = async () => {
    if (!token.trim()) {
      setErrorMessage("Deletion token is required.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/secrets/${secretId}?token=${encodeURIComponent(token.trim())}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete secret or already deleted.");
      }

      setIsDeleted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deletion failed.";
      setErrorMessage(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-12">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {isDeleted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center mx-auto text-emerald-400">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Secret Permanently Destroyed
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The ciphertext has been completely purged from storage. No one can ever view or decrypt it.
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Homepage</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mx-auto text-rose-400">
                  <Flame className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Burn Secret Immediately
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to incinerate this secret now? This cannot be undone.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Deletion Token
                </label>
                <input
                  type="text"
                  placeholder="Paste your deletion token..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <button
                onClick={handleDelete}
                disabled={isDeleting || !token.trim()}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Incinerating Secret...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm & Burn Secret Now</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
