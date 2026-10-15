"use client";

import { useState, useMemo } from "react";
import {
  Environment,
  buildEnvMatrix,
  VariableStatus,
  extractMissingKeysTemplate,
} from "@/lib/envMatrix";
import {
  ShieldAlert,
  Flame,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Download,
  Share2,
  Edit3,
  Search,
  Sparkles,
  Server,
  Terminal,
} from "lucide-react";
import Link from "next/link";

interface MatrixGridProps {
  environments: Environment[];
  onUpdateEnvironment: (id: string, newContent: string) => void;
}

export function MatrixGrid({
  environments,
  onUpdateEnvironment,
}: MatrixGridProps) {
  const [activeFilter, setActiveFilter] = useState<
    "all" | "missing_prod" | "placeholder" | "synced"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState<string | null>(null);

  const matrix = useMemo(
    () => buildEnvMatrix(environments),
    [environments]
  );

  const filteredRows = useMemo(() => {
    return matrix.rows.filter((row) => {
      // Search filter
      if (
        searchQuery &&
        !row.key.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (activeFilter === "missing_prod") {
        return row.isMissingInProd;
      }
      if (activeFilter === "placeholder") {
        return row.isPlaceholderAnywhere;
      }
      if (activeFilter === "synced") {
        return (
          row.environmentsPresentCount === environments.length &&
          !row.isPlaceholderAnywhere
        );
      }

      return true;
    });
  }, [matrix.rows, activeFilter, searchQuery, environments.length]);

  const toggleReveal = (cellId: string) => {
    setRevealedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellId)) next.delete(cellId);
      else next.add(cellId);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  const handleExportMissing = (envId: string) => {
    const template = extractMissingKeysTemplate(environments, envId);
    navigator.clipboard.writeText(template);
    setCopiedExport(envId);
    setTimeout(() => setCopiedExport(null), 2000);
  };

  const getStatusBadge = (status: VariableStatus, isProd?: boolean) => {
    switch (status) {
      case "SYNCED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-md">
            <Check className="w-2.5 h-2.5" /> Synced
          </span>
        );
      case "MISSING":
        return isProd ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-700/80 px-2 py-0.5 rounded-md animate-pulse">
            <ShieldAlert className="w-2.5 h-2.5 text-rose-400" /> MISSING
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
            Missing
          </span>
        );
      case "PLACEHOLDER":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> Placeholder
          </span>
        );
      case "EMPTY":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-md">
            Empty
          </span>
        );
    }
  };

  const editingEnv = environments.find((e) => e.id === editingEnvId);

  return (
    <div className="space-y-6">
      {/* Top Health & Analytics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Health Score Card */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Environment Health
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-3xl font-extrabold ${
                  matrix.healthScore >= 90
                    ? "text-emerald-400"
                    : matrix.healthScore >= 70
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {matrix.healthScore}%
              </span>
              <span className="text-xs text-slate-500">
                {matrix.healthScore >= 90
                  ? "Optimal"
                  : matrix.healthScore >= 70
                  ? "Drift Detected"
                  : "Critical Risk"}
              </span>
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border font-bold text-sm ${
              matrix.healthScore >= 90
                ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                : matrix.healthScore >= 70
                ? "bg-amber-950/60 border-amber-800/60 text-amber-400"
                : "bg-rose-950/60 border-rose-800/60 text-rose-400"
            }`}
          >
            {matrix.healthScore}%
          </div>
        </div>

        {/* Total Variables */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Unique Keys
          </span>
          <div className="text-3xl font-bold text-white mt-1">
            {matrix.totalKeys}
          </div>
          <span className="text-xs text-slate-500">
            Across {environments.length} environments
          </span>
        </div>

        {/* Missing in Production */}
        <div
          onClick={() => setActiveFilter("missing_prod")}
          className={`p-4 rounded-2xl border shadow-xl cursor-pointer transition-all ${
            matrix.criticalIssuesCount > 0
              ? "bg-rose-950/20 border-rose-800/50 hover:border-rose-600"
              : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider block">
              Missing in Prod
            </span>
            {matrix.criticalIssuesCount > 0 && (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="text-3xl font-bold text-rose-400 mt-1">
            {matrix.criticalIssuesCount}
          </div>
          <span className="text-xs text-rose-300/80">
            {matrix.criticalIssuesCount > 0
              ? "Crash hazard on deployment"
              : "All production keys accounted for"}
          </span>
        </div>

        {/* Placeholder Warnings */}
        <div
          onClick={() => setActiveFilter("placeholder")}
          className={`p-4 rounded-2xl border shadow-xl cursor-pointer transition-all ${
            matrix.placeholderWarningsCount > 0
              ? "bg-amber-950/20 border-amber-800/50 hover:border-amber-600"
              : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block">
              Placeholders
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 mt-1">
            {matrix.placeholderWarningsCount}
          </div>
          <span className="text-xs text-amber-300/80">
            Dummy/localhost values
          </span>
        </div>
      </div>

      {/* Controls & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search variable key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "all"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800"
            }`}
          >
            All ({matrix.totalKeys})
          </button>
          <button
            onClick={() => setActiveFilter("missing_prod")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "missing_prod"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800"
            }`}
          >
            Missing in Prod ({matrix.criticalIssuesCount})
          </button>
          <button
            onClick={() => setActiveFilter("placeholder")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "placeholder"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800"
            }`}
          >
            Placeholders ({matrix.placeholderWarningsCount})
          </button>
          <button
            onClick={() => setActiveFilter("synced")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "synced"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800"
            }`}
          >
            Fully Synced ({matrix.syncedCount})
          </button>
        </div>
      </div>

      {/* Main Comparative Matrix Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                <th className="py-3 px-4 w-64 font-mono font-semibold text-cyan-400">
                  VARIABLE KEY
                </th>
                {environments.map((env) => (
                  <th key={env.id} className="py-3 px-4 min-w-[200px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">
                          {env.name}
                        </span>
                        {env.isProduction && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">
                            Prod
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExportMissing(env.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                          title={`Copy missing keys template for ${env.name}`}
                        >
                          {copiedExport === env.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingEnvId(env.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title={`Edit ${env.name} content`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={environments.length + 1}
                    className="p-8 text-center text-slate-500 font-sans"
                  >
                    No variables match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.key}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      row.isMissingInProd ? "bg-rose-950/10" : ""
                    }`}
                  >
                    {/* Key Column */}
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{row.key}</span>
                        {row.isMissingInProd && (
                          <span
                            title="Missing in Production!"
                            className="w-2 h-2 rounded-full bg-rose-500 animate-ping"
                          />
                        )}
                      </div>
                    </td>

                    {/* Environment Value Cells */}
                    {environments.map((env) => {
                      const val = row.values[env.id];
                      const status = row.statuses[env.id];
                      const cellId = `${row.key}-${env.id}`;
                      const isRevealed = revealedCells.has(cellId);

                      return (
                        <td key={env.id} className="py-3 px-4">
                          <div className="space-y-1">
                            <div>{getStatusBadge(status, env.isProduction)}</div>
                            {val !== null && (
                              <div className="flex items-center justify-between gap-1 bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80 group">
                                <span className="text-[11px] text-slate-300 truncate max-w-[140px]">
                                  {isRevealed ? (
                                    val
                                  ) : (
                                    <span className="text-slate-600 select-none tracking-widest text-[10px]">
                                      ••••••••
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => toggleReveal(cellId)}
                                    className="text-slate-500 hover:text-slate-300"
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3 h-3" />
                                    ) : (
                                      <Eye className="w-3 h-3" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(val, cellId)
                                    }
                                    className="text-slate-500 hover:text-slate-300"
                                  >
                                    {copiedCell === cellId ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Environment Content Modal */}
      {editingEnv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Edit Environment: {editingEnv.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingEnvId(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <textarea
              defaultValue={editingEnv.content}
              id="envEditorModalTextarea"
              rows={12}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingEnvId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById(
                    "envEditorModalTextarea"
                  ) as HTMLTextAreaElement;
                  if (el) {
                    onUpdateEnvironment(editingEnv.id, el.value);
                  }
                  setEditingEnvId(null);
                }}
                className="px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl shadow-lg shadow-cyan-500/20"
              >
                Save & Update Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
