"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MatrixGrid } from "@/components/MatrixGrid";
import { CodeAuditTab } from "@/components/CodeAuditTab";
import { Environment } from "@/lib/envMatrix";
import {
  Table,
  Code,
  RotateCcw,
  Sparkles,
  Share2,
  FileCheck,
  Download,
  Flame,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_ENVIRONMENTS: Environment[] = [
  {
    id: "local",
    name: "Local (.env.local)",
    content: `# Local Development Environment
PORT=3000
APP_URL="http://localhost:3000"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myapp_dev"
NEXTAUTH_SECRET="dev_secret_key_123456789"
STRIPE_SECRET_KEY="sk_test_51MzLocalTestKey"
STRIPE_WEBHOOK_SECRET_V2="whsec_local_test"
POSTMARK_API_KEY="change_me"
REDIS_URL="redis://localhost:6379"
`,
  },
  {
    id: "staging",
    name: "Staging (.env.staging)",
    content: `# Staging Pre-Production Environment
PORT=8080
APP_URL="https://staging.myapp.internal"
DATABASE_URL="postgresql://app_user:stag3_p@ss@db-staging.aws.internal:5432/myapp"
NEXTAUTH_SECRET="staging_auth_secret_99887766"
STRIPE_SECRET_KEY="sk_test_51MzStagingKey"
STRIPE_WEBHOOK_SECRET_V2="whsec_staging_live_test"
POSTMARK_API_KEY="pm_live_test_staging"
REDIS_URL="redis://staging-cache.internal:6379"
`,
  },
  {
    id: "production",
    name: "Production (.env.production)",
    isProduction: true,
    content: `# Production Cloud Environment
PORT=8080
APP_URL="https://myapp.com"
# WARNING: Staging had new webhook key, but prod is missing it!
DATABASE_URL="postgresql://app_admin:prod_super_secret_99@db-primary.rds.aws.internal:5432/myapp"
NEXTAUTH_SECRET="prod_auth_secret_secure_hash_889900"
STRIPE_SECRET_KEY="sk_live_51MzProductionStripeKey"
# NOTICE: STRIPE_WEBHOOK_SECRET_V2 is MISSING here!
# NOTICE: POSTMARK_API_KEY is MISSING here!
REDIS_URL="redis://prod-redis-cluster.aws.internal:6379"
`,
  },
  {
    id: "example",
    name: "Template (.env.example)",
    content: `# Environment Template
PORT=3000
APP_URL=""
DATABASE_URL=""
NEXTAUTH_SECRET=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET_V2=""
POSTMARK_API_KEY=""
REDIS_URL=""
`,
  },
];

export default function AuditPage() {
  const [environments, setEnvironments] =
    useState<Environment[]>(DEFAULT_ENVIRONMENTS);
  const [activeTab, setActiveTab] = useState<"matrix" | "code">("matrix");

  const handleUpdateEnv = (id: string, newContent: string) => {
    setEnvironments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, content: newContent } : e))
    );
  };

  const handleReset = () => {
    setEnvironments(DEFAULT_ENVIRONMENTS);
  };

  // Collect all declared keys across all environments
  const declaredKeys = Array.from(
    new Set(
      environments.flatMap((e) =>
        e.content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#") && line.includes("="))
          .map((line) => line.split("=")[0].trim())
      )
    )
  );

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header Title & Sub-Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Env Var & Secrets Auditor
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                Drift Guard
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Prevent deployment crashes by detecting missing keys, mismatched
              values, and undeclared variables between staging, prod, and code.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              title="Reset to default startup scenario"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>

            <Link
              href="/"
              className="text-xs bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 text-cyan-300 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-semibold shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share via EnvShare</span>
            </Link>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "matrix"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Multi-Env Drift Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "code"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Codebase AST Scanner</span>
          </button>
        </div>

        {/* Tab View */}
        {activeTab === "matrix" ? (
          <MatrixGrid
            environments={environments}
            onUpdateEnvironment={handleUpdateEnv}
          />
        ) : (
          <CodeAuditTab declaredEnvKeys={declaredKeys} />
        )}
      </main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>
          EnvAudit • Zero-Data-Leak Secrets Matrix & Codebase Auditor • All processing runs 100% in-browser
        </p>
      </footer>
    </div>
  );
}
