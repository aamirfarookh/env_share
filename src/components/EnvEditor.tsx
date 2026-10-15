"use client";

import { useState, useMemo, ChangeEvent, DragEvent } from "react";
import { parseEnv, generateEnvExample, EnvPair } from "@/lib/envParser";
import {
  FileText,
  Table,
  Upload,
  AlertTriangle,
  Sparkles,
  Download,
  Copy,
  Check,
} from "lucide-react";

interface EnvEditorProps {
  value: string;
  onChange: (val: string) => void;
}

const TEMPLATES: Record<string, string> = {
  nextjs: `# Next.js Environment Variables
NEXT_PUBLIC_APP_URL="https://example.com"
NEXT_PUBLIC_API_ENDPOINT="https://api.example.com/v1"
DATABASE_URL="postgresql://user:password@localhost:5432/app_db?schema=public"
NEXTAUTH_SECRET="f6c8d19e0b8a3e74c82b1d7e29a4f6c8"
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_51Mz..."
STRIPE_WEBHOOK_SECRET="whsec_..."
`,
  database: `# Database Credentials
DB_HOST="db.internal.aws.vpc"
DB_PORT=5432
DB_USER="production_service"
DB_PASSWORD="p@ssw0rd_Super_Secret_#2026"
DB_NAME="primary_warehouse"
DB_SSL_MODE="require"
DB_POOL_MAX=20
`,
  express: `# Node / Express API Environment
PORT=8080
NODE_ENV="production"
JWT_SECRET="super-strong-jwt-secret-phrase"
JWT_EXPIRATION="7d"
REDIS_URL="redis://default:token@redis-12345.upstash.io:6379"
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
`,
};

export function EnvEditor({ value, onChange }: EnvEditorProps) {
  const [tab, setTab] = useState<"raw" | "table">("raw");
  const [dragActive, setDragActive] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);

  const parsed = useMemo(() => parseEnv(value), [value]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content !== undefined) {
        onChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCopyExample = () => {
    const example = generateEnvExample(value);
    navigator.clipboard.writeText(example);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Top action bar: tabs, templates, drag/drop */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTab("raw")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === "raw"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Raw .env
          </button>
          <button
            type="button"
            onClick={() => setTab("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === "table"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Table View
            {parsed.pairs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {parsed.pairs.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Templates dropdown */}
          <div className="relative inline-block text-left">
            <select
              aria-label="Load a template"
              onChange={(e) => {
                if (e.target.value && TEMPLATES[e.target.value]) {
                  onChange(TEMPLATES[e.target.value]);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="" disabled>
                ⚡ Load Template...
              </option>
              <option value="nextjs">Next.js & Auth & DB</option>
              <option value="database">PostgreSQL / MySQL Credentials</option>
              <option value="express">Node.js / Express / Redis</option>
            </select>
          </div>

          {/* Copy .env.example */}
          {parsed.pairs.length > 0 && (
            <button
              type="button"
              onClick={handleCopyExample}
              className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors"
              title="Copy sanitized .env.example with stripped values"
            >
              {copiedExample ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied .example</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy .env.example</span>
                </>
              )}
            </button>
          )}

          {/* Drag & drop upload button */}
          <label className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload .env</span>
            <input
              type="file"
              accept=".env,text/plain"
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Warnings & Linter Banner */}
      {parsed.warnings.length > 0 && (
        <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200/90 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Formatting Warnings ({parsed.warnings.length}):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/80">
            {parsed.warnings.slice(0, 3).map((w, idx) => (
              <li key={idx}>
                Line {w.line}: {w.message}
              </li>
            ))}
            {parsed.warnings.length > 3 && (
              <li>...and {parsed.warnings.length - 3} more issues.</li>
            )}
          </ul>
        </div>
      )}

      {/* Editor Content Area */}
      {tab === "raw" ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-xl border transition-all ${
            dragActive
              ? "border-cyan-400 bg-cyan-950/20"
              : "border-slate-800 bg-slate-950/80 focus-within:border-cyan-500/60"
          }`}
        >
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`# Paste your .env file or drag & drop here
DATABASE_URL="postgres://user:pass@host:5432/dbname"
API_SECRET="sec_1234567890abcdef"
STRIPE_KEY="sk_live_..."
`}
            rows={12}
            className="w-full bg-transparent p-4 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none resize-y leading-relaxed"
          />

          {dragActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm rounded-xl border-2 border-dashed border-cyan-400 pointer-events-none">
              <div className="text-center">
                <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-bounce" />
                <p className="text-sm font-semibold text-cyan-300">
                  Drop your .env file here
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Parsed Key-Value Table */
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
          {parsed.pairs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No environment variables parsed yet. Switch to the Raw .env tab and paste your content.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-4 w-12 text-slate-600">#</th>
                    <th className="py-2.5 px-4 font-mono text-cyan-400">KEY</th>
                    <th className="py-2.5 px-4">VALUE</th>
                    <th className="py-2.5 px-4 text-slate-500">COMMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {parsed.pairs.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                        {p.lineNumber}
                      </td>
                      <td className="py-2.5 px-4 text-slate-200 font-semibold">
                        {p.key}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-400 max-w-xs truncate">
                        {p.value}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 italic text-[11px]">
                        {p.comment ? `# ${p.comment}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>
          {parsed.pairs.length} variables detected • {value.length} characters
        </span>
        <span>Client-side parsed & validated</span>
      </div>
    </div>
  );
}
