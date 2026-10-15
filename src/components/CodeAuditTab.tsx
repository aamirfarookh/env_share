"use client";

import { useState, useMemo } from "react";
import {
  scanCodeString,
  auditCodeAgainstEnv,
  DetectedVariable,
} from "@/lib/codeScanner";
import {
  Code,
  ShieldAlert,
  AlertTriangle,
  Check,
  FileCode,
  Upload,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface CodeAuditTabProps {
  declaredEnvKeys: string[];
}

const SAMPLE_CODE = `// src/api/payments/checkout.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function handleCheckout(req, res) {
  // Accessing database
  const dbUrl = process.env.DATABASE_URL;
  
  // High risk: newly added webhook secret not yet added to prod!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_V2;

  // Analytics integration
  const postmarkKey = process.env.POSTMARK_API_KEY;
  const segmentWriteKey = process.env.SEGMENT_WRITE_KEY;

  res.status(200).json({ status: 'ready' });
}
`;

export function CodeAuditTab({ declaredEnvKeys }: CodeAuditTabProps) {
  const [codeContent, setCodeContent] = useState(SAMPLE_CODE);
  const [fileName, setFileName] = useState("checkout.ts");

  const detected = useMemo(
    () => scanCodeString(codeContent, fileName),
    [codeContent, fileName]
  );

  const audit = useMemo(
    () => auditCodeAgainstEnv(detected, declaredEnvKeys),
    [detected, declaredEnvKeys]
  );

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text !== undefined) {
        setCodeContent(text);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Undeclared (Crash Risk) */}
        <div
          className={`p-4 rounded-2xl border shadow-xl ${
            audit.undeclaredKeys.length > 0
              ? "bg-rose-950/20 border-rose-800/60"
              : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider block">
              Undeclared in .env
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold text-rose-400 mt-1">
            {audit.undeclaredKeys.length}
          </div>
          <span className="text-xs text-rose-300/80">
            {audit.undeclaredKeys.length > 0
              ? "Referenced in code but missing in env!"
              : "All code references accounted for"}
          </span>
        </div>

        {/* Unused Keys (Dead Config) */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block">
              Unused in Code
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 mt-1">
            {audit.unusedKeys.length}
          </div>
          <span className="text-xs text-slate-500">
            Declared in .env but not detected in code
          </span>
        </div>

        {/* Covered Keys */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider block">
              Covered & Verified
            </span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">
            {audit.coveredKeys.length}
          </div>
          <span className="text-xs text-slate-500">
            Active variables verified in both code and env
          </span>
        </div>
      </div>

      {/* Code Input & File Upload Area */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">
              Source Code Auditor (AST & Pattern Matcher)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCodeContent(SAMPLE_CODE);
                setFileName("checkout.ts");
              }}
              className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Load Sample Code</span>
            </button>

            <label className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Source File</span>
              <input
                type="file"
                accept=".ts,.tsx,.js,.jsx,.py,.go"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        </div>

        <textarea
          value={codeContent}
          onChange={(e) => setCodeContent(e.target.value)}
          rows={9}
          placeholder="// Paste TypeScript, JavaScript, or Python source code here..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />

        <div className="text-[11px] text-slate-500 flex justify-between">
          <span>
            Scanned file: <code className="text-cyan-400">{fileName}</code>
          </span>
          <span>
            {audit.detectedVariables.length} unique environment variables detected
          </span>
        </div>
      </div>

      {/* Critical Undeclared Warning Banner */}
      {audit.undeclaredKeys.length > 0 && (
        <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>
              Deployment Crash Hazard: {audit.undeclaredKeys.length} Variables Used in Code Are Not Declared in Any Environment!
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {audit.undeclaredKeys.map((k) => (
              <span
                key={k}
                className="px-2 py-1 rounded bg-rose-900/60 border border-rose-700/80 font-mono text-xs font-semibold text-rose-200"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed References Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-300">
          Detected Variable References in Code
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-2.5 px-4 font-mono text-cyan-400">VARIABLE</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4">LOCATION</th>
                <th className="py-2.5 px-4">CODE SNIPPET</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {audit.detectedVariables.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-sans">
                    No environment variable references detected in the code snippet.
                  </td>
                </tr>
              ) : (
                audit.detectedVariables.map((v) => {
                  const isUndeclared = audit.undeclaredKeys.includes(v.key);
                  return (
                    <tr key={v.key} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-200">
                        {v.key}
                      </td>
                      <td className="py-2.5 px-4">
                        {isUndeclared ? (
                          <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-700 px-2 py-0.5 rounded">
                            UNDECLARED
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded">
                            DECLARED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {v.occurrences.map((o) => `line ${o.line}`).join(", ")}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate text-[11px]">
                        {v.occurrences[0]?.snippet || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
