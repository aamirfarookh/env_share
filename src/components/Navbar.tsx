"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Lock, Table, Info } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const isShareActive = pathname === "/" || pathname?.startsWith("/secret") || pathname?.startsWith("/delete");
  const isAuditActive = pathname === "/audit";

  return (
    <>
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/30 transition-all">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <Lock className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    EnvShare & Audit
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Developer Secrets Suite
                </p>
              </div>
            </Link>

            {/* Main Suite Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <Link
                href="/"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isShareActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Share Secrets (E2EE)</span>
              </Link>
              <Link
                href="/audit"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isAuditActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Env Matrix & Audit</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile nav links */}
            <div className="flex md:hidden items-center gap-1">
              <Link
                href="/"
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  isShareActive ? "text-cyan-300 bg-cyan-950/60" : "text-slate-400"
                }`}
              >
                Share
              </Link>
              <Link
                href="/audit"
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  isAuditActive ? "text-cyan-300 bg-cyan-950/60" : "text-slate-400"
                }`}
              >
                Audit
              </Link>
            </div>

            <button
              onClick={() => setShowHowItWorks(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">How it works</span>
            </button>
            <Link
              href="/"
              className="text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:opacity-95 px-3.5 py-1.5 rounded-xl transition-opacity shadow-sm shadow-cyan-500/20"
            >
              + New Secret
            </Link>
          </div>
        </div>
      </header>

      {/* How it works modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Security & Zero-Knowledge Architecture</h3>
              </div>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-md hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="font-semibold text-cyan-400 block mb-1">
                  1. Zero-Knowledge Secret Sharing
                </span>
                <p className="text-xs text-slate-400">
                  When you share secrets, encryption (AES-256-GCM) happens strictly in your browser. The decryption key is placed after the <code className="text-cyan-300 font-mono">#k=...</code> fragment and is <strong>never transmitted</strong> to any server (RFC 3986).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="font-semibold text-cyan-400 block mb-1">
                  2. In-Memory Env Matrix & Drift Auditing
                </span>
                <p className="text-xs text-slate-400">
                  The Env Matrix & Codebase Auditor processes all environment files and code snippets <strong>100% locally in browser memory</strong>. No environment variables, secret values, or codebase snippets are ever sent across the network.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="font-semibold text-cyan-400 block mb-1">
                  3. Deployment Crash Prevention
                </span>
                <p className="text-xs text-slate-400">
                  By comparing staging, local, and production alongside static code analysis, you immediately catch missing production keys and placeholder values before code is merged.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHowItWorks(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
