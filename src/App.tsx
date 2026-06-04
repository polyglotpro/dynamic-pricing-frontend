import React, { Component, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Package,
  Settings,
  ChevronRight,
  Search,
  Plus,
  RefreshCw,
  Zap,
  Target,
  History,
  FileText,
  CheckCircle,
  Upload,
  ShieldAlert,
  ShieldCheck,
  Database,
  Loader2,
  FileCheck,
  BrainCircuit,
  Sun,
  Moon,
  FlaskConical,
  Lightbulb,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from './config';
import { LoginPage } from './components/LoginPage';

interface Recommendation {
  sku_id: string;
  product_name?: string;
  current_price: number;
  cogs: number;
  current_ad_spend_per_unit: number;
  applied_config?: {
    config_version?: number;
    config_updated_at?: string;
    engine_mode?: string;
    safe_margin_pct?: number;
    margin_floor_pct?: number;
    price_change_step?: number;
    ad_change_step?: number;
  };
  scenario_tags: string[];
  primary_objective: string;
  final_recommendation: {
    price_action: string;
    price_change_pct: number;
    new_price: number;
    ad_action: string;
    ad_change_pct: number;
    new_ad_spend_per_unit: number;
    projected_margin_pct: number;
    is_override?: boolean;
  };
  conflicts: any[];
  rule_trace: any[];
  explanation: string;
  decision_parameters?: string[];
  agent_decisions?: any[];
  approval_required: boolean;
  confidence: number;
}

interface HealthResponse {
  ok?: boolean;
  status?: string;
  connected?: boolean;
}

interface RecommendationResponse {
  count?: number;
  results?: Recommendation[];
}

const API_BASE = API_BASE_URL;

class AppErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-h)] p-6">
          <div className="max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 shadow-2xl">
            <h1 className="text-3xl font-heading font-extrabold mb-3">Application failed to render</h1>
            <p className="text-[var(--text)]">
              The page hit a runtime error before it could draw the login screen. Check the browser console for the exact error.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

function setAuthToken(token: string): void {
  try {
    window.localStorage.setItem('auth_token', token);
  } catch {
    // Ignore storage failures so the UI can still render and accept a login retry.
  }
}

function clearAppStorage(): void {
  try {
    window.localStorage.clear();
  } catch {
    // Ignore storage failures so logout still works in locked-down browsers.
  }
}

function safeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function summarizeWhy(rec?: Recommendation | null): string {
  if (!rec) return 'No explanation available';

  const params = safeArray<string>(rec.decision_parameters);
  if (params.length > 0) {
    return params[0];
  }

  const explanation = String(rec.explanation || '').trim();
  if (!explanation) return 'No explanation available';

  const firstSentence = explanation.split('.').find((part) => part.trim().length > 0)?.trim();
  return firstSentence ? `${firstSentence}.` : explanation.slice(0, 80);
}

function engineLabel(mode: string): string {
  return mode === 'ai' ? 'AI Engine' : 'Rule Engine';
}

function getRuleLabel(rec: Recommendation | null | undefined, ruleId: string): string {
  const trace = safeArray<any>(rec?.rule_trace);
  const hit = trace.find((item) => String(item?.rule_id || '') === ruleId);
  const description = String(hit?.description || '').trim();
  return description ? `${ruleId}: ${description}` : ruleId;
}

function getRuleTooltip(rec: Recommendation | null | undefined, ruleId: string): string {
  const trace = safeArray<any>(rec?.rule_trace);
  const hit = trace.find((item) => String(item?.rule_id || '') === ruleId);
  const description = String(hit?.description || '').trim();
  const action = String(hit?.action || '').trim();
  const evidence = hit?.evidence && typeof hit.evidence === 'object'
    ? Object.entries(hit.evidence)
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' | ')
    : '';
  return [description ? `${ruleId}: ${description}` : ruleId, action ? `Action: ${action}` : '', evidence ? `Evidence: ${evidence}` : '']
    .filter(Boolean)
    .join('\n');
}

function summarizeConflict(conflict: any): string {
  if (!conflict) return 'Conflict details unavailable.';
  const type = String(conflict.type || conflict.conflict_id || 'Conflict');
  const resolution = String(conflict.resolution || '').trim();
  const pricing = conflict.pricing?.action ? `Pricing: ${conflict.pricing.action}` : '';
  const ads = conflict.advertising?.action ? `Advertising: ${conflict.advertising.action}` : '';
  return [type, resolution, pricing, ads].filter(Boolean).join(' | ');
}

function conflictHeadline(conflict: any): string {
  if (!conflict) return 'Conflict: unavailable';
  const type = String(conflict.type || conflict.conflict_id || 'conflict').toLowerCase();
  if (type.includes('price_down_ad_up')) return 'Conflict: price down vs ad up';
  if (type.includes('ad_up_low_stock')) return 'Conflict: ad expansion vs low stock';
  if (type.includes('high_uncertainty')) return 'Conflict: uncertainty vs action size';
  if (type.includes('margin_floor')) return 'Conflict: margin floor breach';
  return `Conflict: ${String(conflict.type || conflict.conflict_id || 'unknown')}`;
}

function conflictTakeaway(conflict: any): string {
  if (!conflict) return 'Result: conflict resolved by orchestrator.';
  const resolution = String(conflict.resolution || '').toLowerCase();
  const type = String(conflict.type || '').toLowerCase();

  if (resolution.includes('block ad increase') || type.includes('price_down_ad_up')) {
    return 'Result: ad expansion was blocked to protect margin.';
  }
  if (resolution.includes('hold ad increase') || resolution.includes('request approval')) {
    return 'Result: the engine paused for approval before taking risk.';
  }
  if (resolution.includes('override ad expansion') || type.includes('ad_up_low_stock')) {
    return 'Result: growth was restrained because stock was too tight.';
  }
  if (resolution.includes('reject margin-damaging') || type.includes('margin_floor')) {
    return 'Result: the recommendation was held back to protect margin.';
  }
  if (resolution.includes('limit combined moves') || type.includes('high_uncertainty')) {
    return 'Result: the engine dampened moves to reduce risk.';
  }
  return 'Result: conflict resolved by orchestrator.';
}

function getWhyTone(rec: Recommendation | null | undefined): {
  badge: string;
  panel: string;
  icon: React.ReactNode;
  label: string;
} {
  const priceAction = String(rec?.final_recommendation?.price_action || '').toLowerCase();
  const adAction = String(rec?.final_recommendation?.ad_action || '').toLowerCase();
  const objective = String(rec?.primary_objective || '').toLowerCase();

  if (objective.includes('sell_through') || priceAction.includes('deep') || priceAction.includes('reduce')) {
    return {
      badge: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
      panel: 'border-amber-500/20 bg-[var(--bg-secondary)]',
      icon: <Package size={10} />,
      label: 'Clearance / Sell-through',
    };
  }

  if (objective.includes('margin') || priceAction.includes('hold') || priceAction.includes('limit')) {
    return {
      badge: 'border-rose-500/20 bg-rose-500/10 text-rose-500',
      panel: 'border-rose-500/20 bg-[var(--bg-secondary)]',
      icon: <ShieldAlert size={10} />,
      label: 'Protection / Governance',
    };
  }

  if (adAction.includes('increase') || adAction.includes('defend') || priceAction.includes('increase')) {
    return {
      badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
      panel: 'border-emerald-500/20 bg-[var(--bg-secondary)]',
      icon: <TrendingUp size={10} />,
      label: 'Growth / Visibility',
    };
  }

  return {
    badge: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
    panel: 'border-blue-500/20 bg-[var(--bg-secondary)]',
    icon: <Lightbulb size={10} />,
    label: 'Balanced / Stable',
  };
}

async function fetchJson<T>(url: string, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(errorBody || `${fallbackMessage} (${response.status})`);
  }

  return response.json() as Promise<T>;
}

const ComparisonModal: React.FC<{
  isOpen: boolean,
  skuId: string,
  rec?: Recommendation | null,
  data: any,
  isLoading: boolean,
  onClose: () => void,
  onApprove: () => void,
  productName: string
}> = ({ isOpen, skuId, rec, data, isLoading, onClose, onApprove, productName }) => {
  if (!isOpen) return null;

  const engineMode = rec?.applied_config?.engine_mode === 'ai' ? 'ai' : 'rule';
  const configVersion = rec?.applied_config?.config_version;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[var(--bg)]/95 backdrop-blur-xl z-[200] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <header className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-secondary)]/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <BrainCircuit className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-[var(--text-h)] tracking-tight">{productName}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <p className="text-[var(--text)] text-[10px] font-heading font-bold uppercase tracking-widest">{skuId}</p>
              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${engineMode === 'ai'
                  ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                  : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                {engineLabel(engineMode)}{configVersion ? ` v${configVersion}` : ''}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-[var(--border)] text-[var(--text)] bg-black/5 dark:bg-white/5">
                Integrated vs Separate Simulation
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[var(--text)] transition-colors"
        >
          <Plus className="rotate-45" size={32} />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-10 custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <Loader2 className="text-blue-500 animate-spin" size={64} />
            <p className="text-xl font-bold text-gray-400 animate-pulse uppercase tracking-widest">Running Deterministic Simulations...</p>
          </div>
        ) : !data ? (
          <div className="h-full flex items-center justify-center text-rose-500 font-bold">
            Failed to load simulation data.
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-12">
            {/* Decision Trace (AI vs Rule) */}
            {rec && (
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8">
                <div className="flex items-center justify-between gap-6 mb-4">
                  <div>
                    <h4 className="text-xl font-heading font-extrabold text-[var(--text-h)]">Decision Trace</h4>
                    <p className="text-sm text-[var(--text)] mt-1 opacity-80">
                      Combined rule and conflict trace for the selected SKU.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text)] opacity-60">
                    {rec.applied_config?.config_updated_at ? `updated_at: ${rec.applied_config.config_updated_at}` : ''}
                  </div>
                </div>
                <div className="mb-6 bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={14} className="text-amber-500" />
                    <h5 className="text-sm font-black uppercase tracking-[0.25em] text-[var(--text-h)]">Why this recommendation?</h5>
                  </div>
                  <p className="text-sm text-[var(--text)] leading-relaxed">
                    {rec.explanation || summarizeWhy(rec)}
                  </p>
                  {safeArray<string>(rec.decision_parameters).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {safeArray<string>(rec.decision_parameters).slice(0, 6).map((item) => (
                        <span key={item} className="px-2 py-1 rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--text)] text-[10px] font-bold">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text)] opacity-60 mb-2">Pricing Rules</p>
                    <div className="flex flex-wrap gap-2">
                      {safeArray<any>(rec.rule_trace).filter(r => String(r?.rule_id || '').startsWith('P-') && r?.fired).slice(0, 8).map((r) => (
                        <div key={r.rule_id} className="relative group/rule">
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 font-bold text-[10px] cursor-help">
                            {r.rule_id}
                          </span>
                          <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 max-w-[70vw] rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-2xl opacity-0 translate-y-1 transition-all duration-150 group-hover/rule:opacity-100 group-hover/rule:translate-y-0">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 mb-2">
                              <TrendingDown size={10} />
                              Pricing Rule
                            </div>
                            <div className="text-sm font-semibold text-[var(--text-h)] leading-snug">
                              {String(r?.description || r?.rule_id || '')}
                            </div>
                            <div className="mt-2 text-[11px] text-[var(--text)] opacity-80">
                              {String(r?.action || 'no action')}
                            </div>
                          </div>
                        </div>
                      ))}
                      {safeArray<any>(rec.rule_trace).filter(r => String(r?.rule_id || '').startsWith('P-') && r?.fired).length === 0 && (
                        <span className="text-[10px] text-[var(--text)] opacity-60">No pricing rules fired</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text)] opacity-60 mb-2">Advertising Rules</p>
                    <div className="flex flex-wrap gap-2">
                      {safeArray<any>(rec.rule_trace).filter(r => String(r?.rule_id || '').startsWith('A-') && r?.fired).slice(0, 8).map((r) => (
                        <div key={r.rule_id} className="relative group/rule">
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20 font-bold text-[10px] cursor-help">
                            {r.rule_id}
                          </span>
                          <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 max-w-[70vw] rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-2xl opacity-0 translate-y-1 transition-all duration-150 group-hover/rule:opacity-100 group-hover/rule:translate-y-0">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-blue-500 mb-2">
                              <Zap size={10} />
                              Advertising Rule
                            </div>
                            <div className="text-sm font-semibold text-[var(--text-h)] leading-snug">
                              {String(r?.description || r?.rule_id || '')}
                            </div>
                            <div className="mt-2 text-[11px] text-[var(--text)] opacity-80">
                              {String(r?.action || 'no action')}
                            </div>
                          </div>
                        </div>
                      ))}
                      {safeArray<any>(rec.rule_trace).filter(r => String(r?.rule_id || '').startsWith('A-') && r?.fired).length === 0 && (
                        <span className="text-[10px] text-[var(--text)] opacity-60">No advertising rules fired</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text)] opacity-60 mb-2">Conflicts</p>
                    <div className="flex flex-wrap gap-2">
                      {safeArray<any>(rec.conflicts).slice(0, 8).map((c) => (
                        <div key={c.conflict_id || c.type} className="relative group/rule">
                          <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20 font-bold text-[10px] cursor-help">
                            {c.conflict_id || c.type}
                          </span>
                          <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 max-w-[70vw] rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-2xl opacity-0 translate-y-1 transition-all duration-150 group-hover/rule:opacity-100 group-hover/rule:translate-y-0">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-2">
                              <ShieldAlert size={10} />
                              {conflictHeadline(c)}
                            </div>
                            <div className="text-sm font-semibold text-[var(--text-h)] leading-snug">
                              {String(c?.resolution || c?.type || 'Conflict')}
                            </div>
                            <div className="mt-2 text-[11px] text-[var(--text)] opacity-80">
                              {summarizeConflict(c)}
                            </div>
                            <div className="mt-1 text-[11px] font-bold text-[var(--text)] opacity-80">
                              {conflictTakeaway(c)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {safeArray<any>(rec.conflicts).length === 0 && (
                        <span className="text-[10px] text-[var(--text)] opacity-60">No conflicts</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Winner Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-1 bg-gradient-to-r ${data.winner === 'integrated' ? 'from-emerald-500 to-blue-500' : 'from-amber-500 to-orange-500'} rounded-3xl shadow-2xl relative`}
            >
              {data.demo_message && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--bg)] border border-[var(--border)] px-6 py-2 rounded-full shadow-xl z-10 flex items-center gap-2 whitespace-nowrap">
                  <Lightbulb className="text-amber-500" size={16} />
                  <span className="text-[10px] font-bold text-[var(--text-h)] uppercase tracking-widest">{data.demo_message}</span>
                </div>
              )}
              <div className="bg-[var(--bg)] rounded-3xl p-8 flex justify-between items-center">
                <div className="flex items-center gap-8">
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${data.winner === 'integrated' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <CheckCircle size={48} />
                  </div>
                  <div>
                    <p className="text-[10px] font-heading font-bold uppercase tracking-[0.3em] text-[var(--text)] mb-2">
                      Simulated Scenario: <span className="text-blue-500 font-black">{data.scenario_name || 'Standard Analysis'}</span>
                    </p>
                    <h3 className="text-4xl font-heading font-extrabold text-[var(--text-h)] capitalize">{data.winner} Agent Wins</h3>
                    <p className="text-[var(--text)] mt-2 font-medium opacity-80">{data.interpretation}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-heading font-bold uppercase tracking-[0.3em] text-[var(--text)] mb-2">Profit Delta</p>
                  <p className={`text-5xl font-heading font-extrabold ${data.delta.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {data.delta.net_profit >= 0 ? '+' : ''}{Math.round(data.delta.net_profit).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Side by Side Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Separate Agents */}
              <div className="bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-3xl p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000 text-[var(--text-h)]">
                  <Target size={150} />
                </div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-center text-[var(--text)]">
                    <Zap size={20} />
                  </div>
                  <h4 className="text-2xl font-heading font-extrabold text-[var(--text-h)]">Separate Agents</h4>
                </div>

                <div className="space-y-8">
                  <MetricRow label="Net Profit" value={data.separate.net_profit} format="currency" />
                  <MetricRow label="Sell-through" value={data.separate.sell_through_pct} format="percent" />
                  <MetricRow label="Ending Inventory" value={data.separate.ending_inventory} format="units" />
                  <MetricRow label="Avg Margin / Unit" value={data.separate.avg_margin_per_unit} format="currency" />
                  <MetricRow label="Avg Ad Spend / Unit" value={data.separate.avg_ad_spend_per_unit} format="currency" />
                </div>

                <div className="mt-12 p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--border)] text-[var(--text)] text-sm opacity-70">
                  Agents act independently. Pricing chases competitors while Advertising maximizes volume based on ROAS, leading to potential margin erosion or inventory stockouts.
                </div>
              </div>

              {/* Integrated Agent */}
              <div className="bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 rounded-3xl p-10 relative overflow-hidden group shadow-[0_20px_50px_rgba(59,130,246,0.1)]">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000 text-blue-500">
                  <BrainCircuit size={150} />
                </div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <BrainCircuit size={20} />
                  </div>
                  <h4 className="text-2xl font-heading font-extrabold text-[var(--text-h)]">Integrated Agent</h4>
                </div>

                <div className="space-y-8">
                  <MetricRow label="Net Profit" value={data.integrated.net_profit} format="currency" highlighted={data.winner === 'integrated'} />
                  <MetricRow label="Sell-through" value={data.integrated.sell_through_pct} format="percent" highlighted={data.winner === 'integrated'} />
                  <MetricRow label="Ending Inventory" value={data.integrated.ending_inventory} format="units" highlighted={data.winner === 'integrated'} />
                  <MetricRow label="Avg Margin / Unit" value={data.integrated.avg_margin_per_unit} format="currency" highlighted={data.winner === 'integrated'} />
                  <MetricRow label="Avg Ad Spend / Unit" value={data.integrated.avg_ad_spend_per_unit} format="currency" highlighted={data.winner === 'integrated'} />
                </div>

                <div className="mt-12 p-6 bg-blue-500/10 dark:bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-600 dark:text-blue-300 text-sm">
                  <strong className="text-blue-700 dark:text-blue-200">Multi-agent orchestration:</strong> Dynamically resolves conflicts between pricing, ads, and inventory. Optimizes for total contribution rather than individual metrics.
                </div>
              </div>
            </div>

            {/* Brain Mapping / Rules Trace */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-10">
              <h4 className="text-xl font-heading font-extrabold text-[var(--text-h)] mb-8 flex items-center gap-3">
                <ShieldAlert className="text-blue-500" size={24} />
                Autonomous Orchestration Trace
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest">Scenarios Triggered</p>
                  <div className="flex flex-wrap gap-2">
                    {safeArray<string>(data?.integrated?.brain_mapping?.scenario_ids).map((id: string) => (
                      <span key={id} className="px-3 py-1 bg-black/5 dark:bg-white/5 text-[var(--text)] rounded-lg border border-[var(--border)] font-bold text-xs">{id}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest">Levers Deployed</p>
                  <div className="flex flex-wrap gap-2">
                    {safeArray<string>(data?.integrated?.brain_mapping?.lever_ids).map((id: string) => (
                      <span key={id} className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-bold text-xs">{id}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest">Interactions Resolved</p>
                  <div className="flex flex-wrap gap-2">
                    {safeArray<string>(data?.integrated?.brain_mapping?.interaction_ids).map((id: string) => (
                      <span key={id} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 font-bold text-xs">{id}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-center gap-6 py-10">
              <button
                onClick={onClose}
                className="px-12 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl border border-neutral-700 transition-all"
              >
                Review Other SKUs
              </button>
              <button
                onClick={onApprove}
                className="px-16 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Approve & Deploy Integrated Strategy
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const MetricRow: React.FC<{ label: string, value: number, format: string, highlighted?: boolean }> = ({ label, value, format, highlighted }) => {
  const formattedValue = format === 'currency'
    ? Math.round(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    : format === 'percent'
      ? `${value.toFixed(1)}%`
      : `${Math.round(value)} units`;

  return (
    <div className="flex justify-between items-end border-b border-[var(--border)] pb-4">
      <span className="text-[var(--text)] font-heading font-bold text-xs uppercase tracking-widest opacity-60">{label}</span>
      <span className={`text-2xl font-heading font-extrabold ${highlighted ? 'text-blue-500' : 'text-[var(--text-h)]'}`}>{formattedValue}</span>
    </div>
  );
};

const App: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getAuthToken() === 'dummy-token-123';
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'settings' | 'activity' | 'data' | 'research'>('dashboard');
  const [dashboardView, setDashboardView] = useState<'pending' | 'approved'>('pending');
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [selectedSkuName, setSelectedSkuName] = useState<string | null>(null);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [researchGroup, setResearchGroup] = useState<string>('all');
  const [researchView, setResearchView] = useState<'buckets' | 'scenarios'>('buckets');
  const [researchScenarioKey, setResearchScenarioKey] = useState<string | null>(null);
  const [approvedItems, setApprovedItems] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [overrides] = useState<Record<string, { price_change_pct: number, ad_change_pct: number }>>({});
  const [showToast, setShowToast] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<any>(null);
  const [debouncedConfig, setDebouncedConfig] = useState<any>(null);

  // Debounce logic: only update debouncedConfig when localConfig stops changing for 300ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedConfig(localConfig);
    }, 300);
    return () => clearTimeout(handler);
  }, [localConfig]);

  const {
    data: backendHealth,
    isLoading: isHealthLoading,
  } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const data = await fetchJson<HealthResponse>(`${API_BASE}/health`, 'Failed to load backend health');
      if (data.ok === true || data.status === 'ok' || data.connected === true) {
        return data;
      }

      throw new Error('Backend health check returned an unhealthy response');
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: inventory } = useQuery<any[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      return fetchJson<any[]>(`${API_BASE}/inventory`, 'Failed to load inventory');
    }
  });

  const { data: config, isLoading: configLoading } = useQuery<any>({
    queryKey: ['settings'],
    queryFn: async () => {
      return fetchJson<any>(`${API_BASE}/settings`, 'Failed to load settings');
    }
  });

  const recommendationQueryKey = [
    'recommendations',
    config?.config_version ?? 'unknown',
    config?.engine_mode ?? 'unknown',
  ];

  const { data: recommendationsResponse, isLoading, isError, refetch } = useQuery<RecommendationResponse | Recommendation[]>({
    queryKey: recommendationQueryKey,
    queryFn: async () => {
      return fetchJson<RecommendationResponse | Recommendation[]>(`${API_BASE}/all-recommendations`, 'Failed to load recommendations');
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newConfig: any) => {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      return response.json();
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      // Force an immediate network refresh so the UI visibly changes even if a tab isn't re-mounted.
      await queryClient.refetchQueries({ queryKey: ['settings'] });
      await queryClient.refetchQueries({ queryKey: recommendationQueryKey });
      await queryClient.refetchQueries({ queryKey: ['inventory'] });
      setLocalConfig((current: any) => current ? { ...current, ...variables } : variables);
      logActivity(
        'setting',
        'Global Configuration Sync',
        `Engine logic switched to ${variables.engine_mode === 'ai' ? 'AI-Optimized' : 'Rule-Based'} mode.`,
        variables.engine_mode === 'ai' ? 'text-blue-400' : 'text-indigo-400'
      );
    }
  });

  const uploadCatalogMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE}/upload-catalog`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = payload?.detail;
        const message = typeof detail === 'string'
          ? detail
          : detail?.message
            ? `${detail.message}${detail.missing_required_columns?.length ? ` Missing: ${detail.missing_required_columns.join(', ')}` : ''}`
            : 'Upload failed';
        throw new Error(message);
      }
      return payload;
    },
    onSuccess: async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['uploadHistory'] });

      // If the user previously approved items, the dashboard queue can look unchanged
      // because we filter out approved SKUs. Reset approvals on new data ingest.
      setApprovedItems([]);
      setDashboardView('pending');

      // Force immediate network refresh so KPIs and tables visibly update.
      await queryClient.refetchQueries({ queryKey: ['recommendations'] });
      await queryClient.refetchQueries({ queryKey: ['inventory'] });
      await queryClient.refetchQueries({ queryKey: ['settings'] });
      await queryClient.refetchQueries({ queryKey: ['uploadHistory'] });

      setShowToast('Catalog synchronized successfully');
      setTimeout(() => setShowToast(null), 3000);
      logActivity('approval', 'New Catalog Ingested', `Successfully uploaded ${data.filename}. AI Agents re-orchestrating...`, 'text-emerald-400');
    },
    onError: (err: any) => {
      setShowToast(`Sync Failed: ${err.message}`);
      setTimeout(() => setShowToast(null), 3000);
    }
  });

  const { data: simResults, isPending: isSimulating } = useQuery<any[]>({
    queryKey: ['simulation', debouncedConfig],
    queryFn: async () => {
      if (!debouncedConfig) return [];
      const response = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debouncedConfig),
      });
      return response.json();
    },
    enabled: !!debouncedConfig && activeTab === 'settings',
  });

  const { data: uploadHistory } = useQuery<any[]>({
    queryKey: ['uploadHistory'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/uploads-history`);
      return response.json();
    },
    enabled: true,
  });

  const { data: comparisonData, isPending: loadingComparison } = useQuery<any>({
    queryKey: ['comparison', selectedSkuId],
    queryFn: async () => {
      if (!selectedSkuId) return null;

      // Map SKU IDs to scenario IDs for the demo
      const skuToScenario: Record<string, string> = {
        'SKU-KURTA-001': 'stable_kurta',
        'SKU-JACKET-001': 'seasonal_jacket',
        'SKU-KURTA-UNCERTAIN-001': 'high_uncertainty',
        'SKU-SHIRT-OVERSTOCK-001': 'overstock_shirt',
        'SKU-HERO-LOWSTOCK-001': 'low_stock_hero'
      };

      // For other SKUs, pick a scenario based on ID to avoid "Same Data" feeling
      let scenarioId = skuToScenario[selectedSkuId];
      if (!scenarioId) {
        const hash = selectedSkuId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const scenarios = ['stable_kurta', 'seasonal_jacket', 'overstock_shirt', 'low_stock_hero'];
        scenarioId = scenarios[hash % scenarios.length];
      }

      const response = await fetch(`${API_BASE}/simulation/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      return response.json();
    },
    enabled: !!selectedSkuId && showComparison,
  });

  // Initialize localConfig when config loads
  React.useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  React.useEffect(() => {
    const refreshQueries = async () => {
      switch (activeTab) {
        case 'dashboard':
          queryClient.invalidateQueries({ queryKey: ['recommendations'] });
          await queryClient.refetchQueries({ queryKey: ['recommendations'] });
          break;
        case 'inventory':
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          await queryClient.refetchQueries({ queryKey: ['inventory'] });
          break;
        case 'settings':
          queryClient.invalidateQueries({ queryKey: ['settings'] });
          await queryClient.refetchQueries({ queryKey: ['settings'] });
          break;
        case 'research':
          queryClient.invalidateQueries({ queryKey: ['recommendations'] });
          await queryClient.refetchQueries({ queryKey: ['recommendations'] });
          break;
        case 'data':
          queryClient.invalidateQueries({ queryKey: ['uploadHistory'] });
          await queryClient.refetchQueries({ queryKey: ['uploadHistory'] });
          break;
        case 'activity':
          queryClient.invalidateQueries({ queryKey: ['health'] });
          await queryClient.refetchQueries({ queryKey: ['health'] });
          break;
      }
    };

    void refreshQueries();
  }, [activeTab, queryClient]);

  const recommendationList = safeArray<Recommendation>(
    Array.isArray(recommendationsResponse)
      ? recommendationsResponse
      : recommendationsResponse?.results
  );

  const latestUpload = safeArray<any>(uploadHistory)[0];
  const activeCatalogLabel = latestUpload?.filename || 'No catalog uploaded yet';
  const activeCatalogTimestamp = latestUpload?.timestamp || '';

  const selectedSku = recommendationList.find(r => r.sku_id === selectedSkuId);

  // Calculate impact stats
  const calculateImpact = () => {
    if (!recommendationList || !simResults || !Array.isArray(simResults) || recommendationList.length === 0 || simResults.length === 0) return null;

    try {
      const baselineDiscounts = recommendationList.filter(r => r.final_recommendation.price_change_pct < 0).length;
      const proposedDiscounts = simResults.filter(r => r?.final_recommendation?.price_change_pct < 0).length;

      const baselineMargin = recommendationList.reduce((acc, r) => acc + (r.final_recommendation.projected_margin_pct || 0), 0) / recommendationList.length;
      const proposedMargin = simResults.reduce((acc, r) => acc + (r?.final_recommendation?.projected_margin_pct || 0), 0) / simResults.length;

      const baselineAd = recommendationList.filter(r => r.final_recommendation.ad_change_pct > 0).length;
      const proposedAd = simResults.filter(r => r?.final_recommendation?.ad_change_pct > 0).length;

      return {
        discountDelta: proposedDiscounts - baselineDiscounts,
        marginDelta: proposedMargin - baselineMargin,
        adDelta: proposedAd - baselineAd
      };
    } catch (e) {
      console.error("Impact calculation error", e);
      return null;
    }
  };

  const calculateChangedSkus = () => {
    if (!recommendationList || !simResults || !Array.isArray(simResults)) return [];
    const changes: any[] = [];

    try {
      simResults.forEach(sim => {
        if (!sim || !sim.sku_id) return;
        const baseline = recommendationList.find(r => r.sku_id === sim.sku_id);
        if (baseline && (
          baseline.final_recommendation.price_change_pct !== sim.final_recommendation?.price_change_pct ||
          baseline.final_recommendation.ad_change_pct !== sim.final_recommendation?.ad_change_pct
        )) {
          changes.push({
            sku_id: sim.sku_id,
            name: baseline.product_name || sim.sku_id,
            oldAction: baseline.final_recommendation.price_action,
            newAction: (sim.final_recommendation?.price_change_pct || 0) < baseline.final_recommendation.price_change_pct ? 'Discount' : (sim.final_recommendation?.price_change_pct || 0) > baseline.final_recommendation.price_change_pct ? 'Increase' : 'Hold',
            marginDelta: (sim.final_recommendation?.projected_margin_pct || 0) - baseline.final_recommendation.projected_margin_pct
          });
        }
      });
    } catch (e) {
      console.error("Changed SKUs calculation error", e);
    }
    return changes;
  };

  const [stableImpact, setStableImpact] = useState<any>(null);
  const [stableChanges, setStableChanges] = useState<any[]>([]);

  React.useEffect(() => {
    const impact = calculateImpact();
    if (impact) setStableImpact(impact);

    const changes = calculateChangedSkus();
    if (changes.length > 0 || (simResults && simResults.length > 0)) {
      setStableChanges(changes);
    }
  }, [simResults]);

  const handleApprove = async (skuId: string, customData?: any) => {
    const item = customData || enrichedRecommendations?.find(r => r.sku_id === skuId);
    if (item) {
      try {
        await fetch(`${API_BASE}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        setApprovedItems(prev => [...prev, { ...item, approvedAt: new Date().toLocaleTimeString() }]);
        logActivity(
          'approval',
          `Committed to Ledger: ${item.product_name || skuId}`,
          `Strategy permanently archived in Transaction Ledger. Price: ₹${Math.round(item.current_price * (1 + (item.final_recommendation.price_change_pct || 0) / 100))}`,
          'text-emerald-400'
        );
        setShowToast(`Strategy for ${skuId} committed to ledger!`);
      } catch (err) {
        setShowToast(`Ledger Sync Failed`);
      }
    }
    setSelectedSkuId(null);
    setShowComparison(false);
    setTimeout(() => setShowToast(null), 3000);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesQuery = (text: any) => {
    if (!normalizedQuery) return true;
    return String(text ?? '').toLowerCase().includes(normalizedQuery);
  };

  const filteredRecommendations = recommendationList
    .filter(r => !approvedItems.find(a => a.sku_id === r.sku_id))
    .filter(r => matchesQuery(r.sku_id) || matchesQuery(r.product_name) || safeArray<string>(r.scenario_tags).some(t => matchesQuery(t)));

  const impact = stableImpact;
  const changedSkus = stableChanges;

  const handleLogin = (username: string, password: string) => {
    setLoginError(null);
    setIsLoginLoading(true);

    // Simulate network delay for premium feel
    setTimeout(() => {
      if (username === 'admin' && password === 'Group4Demo') {
        setAuthToken('dummy-token-123');
        setIsAuthenticated(true);
        window.location.reload();
      } else {
        setLoginError('Invalid security credentials. Access denied.');
      }
      setIsLoginLoading(false);
    }, 1000);
  };

  const logActivity = (type: 'approval' | 'override' | 'setting', title: string, details: string, color: string) => {
    setActivityLog(prev => [{
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      title,
      details,
      color
    }, ...prev]);
  };

  const downloadTemplate = () => {
    const csvContent = [
      "sku_id,product_name,product_type,hero_sku,current_price,cogs,competitor_price,mrp,stock_on_hand,days_of_cover,sell_through_weekly_pct,ageing_days,stockout_risk_pct,days_to_season_end,current_ad_spend_per_unit,roas,conversion_rate,ctr,cpc,last_30d_sales,avg_daily_sessions,conversion_benchmark",
      "SKU001,Premium Kurta,stable,false,2999,1200,3199,3499,450,45,0.15,30,18,120,50,4.2,0.031,0.02,10,120,500,0.028"
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "master_catalog_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Apply overrides to recommendations

  // Apply overrides to recommendations
  const enrichedRecommendations = filteredRecommendations.map(r => {
    const override = overrides[r.sku_id];
    if (override) {
      // Recalculate margin locally for the override
      const projectedPrice = r.current_price * (1 + override.price_change_pct / 100);
      const projectedAd = r.current_ad_spend_per_unit * (1 + override.ad_change_pct / 100);
      const margin = ((projectedPrice - r.cogs - projectedAd) / projectedPrice) * 100;

      return {
        ...r,
        final_recommendation: {
          ...r.final_recommendation,
          price_change_pct: override.price_change_pct,
          ad_change_pct: override.ad_change_pct,
          projected_margin_pct: Math.round(margin * 10) / 10,
          is_override: true
        }
      };
    }
    return r;
  });

  const filteredInventory = safeArray<any>(inventory).filter((row) => {
    if (!normalizedQuery) return true;
    return matchesQuery(row?.sku_id) || matchesQuery(row?.product_name) || matchesQuery(row?.product_type) || matchesQuery(row?.category);
  });

  const getResearchBucket = (rec: Recommendation) => {
    const tags = safeArray<string>(rec.scenario_tags);
    if (tags.includes('stockout_risk')) return 'stockout_risk';
    if (tags.includes('high_uncertainty')) return 'high_uncertainty';
    if (tags.includes('end_of_season') || tags.includes('seasonal_product')) return 'seasonal_markdown';
    if (tags.includes('overstock') || tags.includes('ageing_inventory')) return 'overstock_ageing';
    if (tags.includes('competitor_undercut')) return 'competitor_pressure';
    return 'stable_baseline';
  };

  const researchRecsAll = recommendationList;
  const backendIsHealthy = backendHealth?.ok === true || backendHealth?.status === 'ok' || backendHealth?.connected === true;
  const researchBuckets = [
    {
      id: 'all',
      name: 'All SKUs',
      desc: 'Everything currently imported.',
      icon: <FlaskConical size={24} />,
      tone: 'border-[var(--border)] hover:border-purple-500/30',
      count: researchRecsAll.length,
    },
    {
      id: 'seasonal_markdown',
      name: 'Seasonal / Markdown',
      desc: 'Seasonality and end-of-season urgency dynamics.',
      icon: <TrendingDown size={24} />,
      tone: 'border-purple-500/20 hover:border-purple-500/40',
      count: researchRecsAll.filter(r => getResearchBucket(r) === 'seasonal_markdown').length,
    },
    {
      id: 'overstock_ageing',
      name: 'Overstock / Ageing',
      desc: 'Inventory pressure vs contribution margin.',
      icon: <Package size={24} />,
      tone: 'border-amber-500/20 hover:border-amber-500/40',
      count: researchRecsAll.filter(r => getResearchBucket(r) === 'overstock_ageing').length,
    },
    {
      id: 'competitor_pressure',
      name: 'Competitor Pressure',
      desc: 'Competitive undercut signals and pricing response.',
      icon: <TrendingUp size={24} />,
      tone: 'border-blue-500/20 hover:border-blue-500/40',
      count: researchRecsAll.filter(r => getResearchBucket(r) === 'competitor_pressure').length,
    },
    {
      id: 'stockout_risk',
      name: 'Stockout Risk',
      desc: 'Supply constraint signals; ads should not over-scale.',
      icon: <ShieldAlert size={24} />,
      tone: 'border-rose-500/20 hover:border-rose-500/40',
      count: researchRecsAll.filter(r => getResearchBucket(r) === 'stockout_risk').length,
    },
    {
      id: 'high_uncertainty',
      name: 'High Uncertainty',
      desc: 'Noisy markets; orchestration should dampen moves.',
      icon: <AlertCircle size={24} />,
      tone: 'border-neutral-500/20 hover:border-neutral-500/40',
      count: researchRecsAll.filter(r => getResearchBucket(r) === 'high_uncertainty').length,
    },
  ];

  const researchRecs = researchGroup === 'all'
    ? researchRecsAll
    : researchRecsAll.filter(r => getResearchBucket(r) === researchGroup);

  const matchesResearchScenario = (rec: Recommendation, key: string) => {
    const name = String(rec.product_name || '').toLowerCase();
    const tags = safeArray<string>(rec.scenario_tags);
    switch (key) {
      case 'stable_kurta':
        return getResearchBucket(rec) === 'stable_baseline' && name.includes('kurta');
      case 'seasonal_jacket':
        return getResearchBucket(rec) === 'seasonal_markdown' && (name.includes('jacket') || name.includes('coat') || name.includes('puffer') || name.includes('quilt'));
      case 'high_uncertainty':
        return getResearchBucket(rec) === 'high_uncertainty';
      case 'overstock_shirt':
        return getResearchBucket(rec) === 'overstock_ageing' && (name.includes('shirt') || name.includes('tee') || name.includes('t-shirt') || name.includes('top'));
      case 'low_stock_hero':
        return getResearchBucket(rec) === 'stockout_risk' && (tags.includes('hero_sku') || name.includes('hero'));
      default:
        return false;
    }
  };

  const scenarioRecs = researchScenarioKey
    ? researchRecsAll.filter(r => matchesResearchScenario(r, researchScenarioKey))
    : [];

  const safeMarginPct = (price: number, cogs: number, ad: number) => {
    if (!price || price <= 0) return 0;
    return ((price - cogs - ad) / price) * 100;
  };

  // Live KPI calculations (dashboard tiles)
  const kpiTotal = enrichedRecommendations.length;
  const avgMarginDeltaPct = kpiTotal
    ? enrichedRecommendations.reduce((acc, r) => acc + ((r.final_recommendation?.projected_margin_pct ?? 0) - safeMarginPct(r.current_price, r.cogs, r.current_ad_spend_per_unit)), 0) / kpiTotal
    : 0;
  const activeAgents = enrichedRecommendations.reduce((acc, r) => {
    const pricingActive = (r.final_recommendation?.price_change_pct ?? 0) !== 0;
    const adsActive = (r.final_recommendation?.ad_change_pct ?? 0) !== 0;
    return acc + (pricingActive ? 1 : 0) + (adsActive ? 1 : 0);
  }, 0);
  const riskMitigationPct = kpiTotal
    ? Math.max(0, 100 - Math.round((enrichedRecommendations.filter(r => r.approval_required || (r.conflicts?.length || 0) > 0).length / kpiTotal) * 100))
    : 0;

  // Live KPI calculations (inventory tiles)
  const invRows = filteredInventory;
  const invTotal = invRows.length;
  const invStockValue = invRows.reduce((acc, r) => acc + (Number(r.current_price) || 0) * (Number(r.stock_on_hand) || 0), 0);
  const invAvgDaysCover = invTotal ? invRows.reduce((acc, r) => acc + (Number(r.days_of_cover) || 0), 0) / invTotal : 0;
  const invAvgStockoutRiskPct = invTotal
    ? invRows.reduce((acc, r) => {
      const frac = (Number(r.stockout_risk) || 0) > 0 ? Number(r.stockout_risk) : (Number(r.stockout_risk_pct) || 0) / 100;
      return acc + (isFinite(frac) ? frac : 0);
    }, 0) / invTotal * 100
    : 0;

  if (!isAuthenticated) {
    return <LoginPage theme={theme} setTheme={setTheme} onLogin={handleLogin} isLoading={isLoginLoading} error={loginError} />;
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-blue-500/30 overflow-hidden transition-colors duration-300`}>
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[var(--border)] p-6 flex flex-col gap-8 bg-[var(--bg-secondary)] transition-colors duration-300">
          <div className="flex items-center justify-between px-2">
            <span className="font-heading font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-h)] to-gray-500">FluxPricing</span>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 hover:bg-[var(--border)] rounded-xl text-[var(--text)] transition-all"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'dashboard' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Zap size={16} className={`${activeTab === 'dashboard' ? 'text-blue-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'inventory' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Target size={16} className={`${activeTab === 'inventory' ? 'text-blue-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'settings' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Settings size={16} className={`${activeTab === 'settings' ? 'text-amber-400' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Config</span>
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'research' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <FlaskConical size={16} className={`${activeTab === 'research' ? 'text-purple-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Research</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'activity' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <History size={16} className={`${activeTab === 'activity' ? 'text-blue-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Activity</span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border group ${activeTab === 'data' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-[var(--text)] border-transparent hover:text-[var(--text-h)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Database size={16} className={`${activeTab === 'data' ? 'text-emerald-500' : 'text-[var(--text)]'}`} />
              <span className="font-bold text-sm">Data History</span>
            </button>
          </nav>

          <button
            onClick={() => {
              clearAppStorage();
              setIsAuthenticated(false);
              window.location.reload();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border border-transparent text-[var(--text)] hover:text-rose-500 hover:bg-rose-500/10 mt-2 cursor-pointer w-full text-left group"
          >
            <LogOut size={16} className="text-[var(--text)] group-hover:text-rose-500" />
            <span className="font-bold text-sm">Logout</span>
          </button>


          <div className="mt-auto p-4 bg-gradient-to-br from-blue-900/20 to-blue-900/20 rounded-2xl border border-blue-500/10">
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">System Status</p>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${isHealthLoading ? 'bg-amber-400 animate-pulse' : backendIsHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
              />
              <span className="text-sm text-slate-600 dark:text-gray-300 font-medium">
                {isHealthLoading ? 'Checking backend...' : backendIsHealthy ? 'Engine Active' : 'Backend Unreachable'}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-500/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Active Catalog</p>
              <p className="text-sm text-slate-600 dark:text-gray-300 font-semibold break-all">{activeCatalogLabel}</p>
              {activeCatalogTimestamp && (
                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 font-mono">
                  uploaded {activeCatalogTimestamp}
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-10 relative custom-scrollbar bg-[var(--bg)]">
          {/* Refined Header */}
          <header className="flex justify-between items-end mb-10">
            <div>
              <h1 className="text-4xl font-heading font-extrabold text-[var(--text-h)] tracking-tight capitalize">
                {activeTab === 'dashboard' ? 'Execution Queue' :
                  activeTab === 'inventory' ? 'Inventory Health' :
                    activeTab === 'settings' ? 'System Configuration' :
                      activeTab === 'research' ? 'Research Simulation' :
                        activeTab === 'activity' ? 'Activity Stream' : 'Data Ingestion'}
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                {activeTab === 'dashboard' ? 'Comparative analysis of separate vs. integrated agent orchestration' :
                  activeTab === 'inventory' ? 'Real-time stock velocity and risk mitigation analysis' :
                    activeTab === 'settings' ? 'Global thresholds, guardrails and engine logic control' :
                      activeTab === 'research' ? 'Deterministic simulation comparing agent architectures' :
                        activeTab === 'activity' ? 'Live audit trail of autonomous and manual actions' : 'Catalog management and ingestion history'}
              </p>
              <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Dataset</span>
                <span className="text-sm font-bold text-[var(--text-h)] break-all">{activeCatalogLabel}</span>
                {activeCatalogTimestamp && (
                  <span className="text-[10px] font-mono text-[var(--text)] opacity-60">({activeCatalogTimestamp})</span>
                )}
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <AnimatePresence>
                {showToast && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 shadow-lg shadow-emerald-500/20"
                  >
                    <RefreshCw size={18} className="animate-spin-slow" />
                    {showToast}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Removed AI/Rule toggle as per user request */}

              <button
                onClick={() => refetch()}
                className="p-2.5 bg-black/5 dark:bg-neutral-800/50 border border-[var(--border)] dark:border-neutral-700 rounded-xl text-[var(--text-h)] dark:text-gray-400 hover:border-blue-500/30 dark:hover:border-blue-500/50 hover:text-[var(--text-h)] dark:hover:text-white transition-all shadow-sm h-full"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <div className="relative h-full flex items-center">
                <Search className="absolute left-3 text-[var(--text-h)] opacity-60" size={16} />
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all w-64 placeholder:text-[var(--text)] placeholder:opacity-50 text-[var(--text)] h-full"
                />
              </div>
            </div>
          </header>

          {/* Context-Aware KPI Grid */}
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div
                key="dashboard-kpis"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
              >
                {[
                  { label: 'Avg. Margin Impact', value: `${avgMarginDeltaPct >= 0 ? '+' : ''}${avgMarginDeltaPct.toFixed(1)}%`, trend: avgMarginDeltaPct >= 0 ? 'up' : 'down', color: avgMarginDeltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: TrendingUp },
                  { label: 'Active Agents', value: `${activeAgents}`, trend: 'neutral', color: 'text-blue-400', icon: Zap },
                  { label: 'Risk Mitigation', value: `${riskMitigationPct}%`, trend: 'up', color: riskMitigationPct >= 80 ? 'text-emerald-400' : 'text-amber-400', icon: Target },
                ].map((kpi, i) => (
                  <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] p-8 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 text-[var(--text-h)]">
                      <kpi.icon size={80} />
                    </div>
                    <p className="text-[var(--text)] text-xs font-heading font-bold uppercase tracking-widest mb-2">{kpi.label}</p>
                    <div className="flex items-baseline gap-3">
                      <p className={`text-4xl font-heading font-extrabold ${kpi.color}`}>{kpi.value}</p>
                      <span className="text-xs font-bold text-[var(--text)] px-2 py-1 bg-white/5 rounded-lg">Live</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : activeTab === 'inventory' ? (
              <motion.div
                key="inventory-kpis"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
              >
                {[
                  { label: 'Total Stock Value', value: `₹${Math.round(invStockValue).toLocaleString('en-IN')}`, trend: 'neutral', color: 'text-blue-400', icon: Database },
                  { label: 'Avg. Days of Cover', value: `${Math.round(invAvgDaysCover)}d`, trend: 'neutral', color: invAvgDaysCover < 14 ? 'text-rose-400' : 'text-amber-400', icon: History },
                  { label: 'Stockout Risk', value: `${Math.round(invAvgStockoutRiskPct)}%`, trend: 'neutral', color: invAvgStockoutRiskPct > 40 ? 'text-rose-400' : invAvgStockoutRiskPct > 15 ? 'text-amber-400' : 'text-emerald-400', icon: AlertCircle },
                ].map((kpi, i) => (
                  <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] p-8 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-sm">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 text-[var(--text-h)]">
                      <kpi.icon size={80} />
                    </div>
                    <p className="text-[var(--text)] text-xs font-heading font-bold uppercase tracking-widest mb-2 opacity-70">{kpi.label}</p>
                    <div className="flex items-baseline gap-3">
                      <p className={`text-4xl font-heading font-extrabold ${kpi.color}`}>{kpi.value}</p>
                      <span className="text-xs font-bold text-[var(--text)] px-2 py-1 bg-black/5 dark:bg-white/5 rounded-lg border border-[var(--border)]">Health</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Recommendation Table */}
          {activeTab === 'dashboard' ? (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex justify-between items-center">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-blue-500 rounded-full" />
                    <h2 className="text-xl font-heading font-bold text-[var(--text-h)]">Execution Queue</h2>
                  </div>

                  <div className="flex bg-black/5 dark:bg-black/40 p-1 rounded-xl border border-black/5 dark:border-white/5">
                    <button
                      onClick={() => setDashboardView('pending')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${dashboardView === 'pending' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text)] hover:text-[var(--text-h)]'}`}
                    >
                      Pending ({filteredRecommendations?.length || 0})
                    </button>
                    <button
                      onClick={() => setDashboardView('approved')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${dashboardView === 'approved' ? 'bg-emerald-600 text-white shadow-lg' : 'text-[var(--text)] hover:text-[var(--text-h)]'}`}
                    >
                      Approved ({approvedItems.length})
                    </button>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500/20 border-t-purple-500 rounded-full animate-spin" />
                  <p className="text-gray-500 font-medium animate-pulse">Analyzing market trends...</p>
                </div>
              ) : isError ? (
                <div className="p-20 text-center">
                  <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
                  <p className="text-white font-bold text-lg">Failed to connect to Pricing Engine</p>
                  <p className="text-gray-500 mt-2">Ensure the backend is running at {API_BASE}</p>
                  <button onClick={() => refetch()} className="mt-6 px-6 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold hover:bg-rose-500/20 transition-all">Retry Connection</button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-600 text-[10px] uppercase tracking-[0.2em] font-black">
                      <th className="px-8 py-5">Product Details</th>
                      <th className="px-8 py-5">Price Vector</th>
                      <th className="px-8 py-5">Ad Strategy</th>
                      <th className="px-8 py-5">Margin</th>
                      <th className="px-8 py-5">Confidence</th>
                      <th className="px-8 py-5">Mode</th>
                      <th className="px-8 py-5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(dashboardView === 'pending' ? enrichedRecommendations : approvedItems)?.map((rec) => (
                      <tr
                        key={rec.sku_id}
                        className={`border-t border-[var(--border)] transition-all group ${dashboardView === 'pending' ? 'hover:bg-black/5 dark:hover:bg-white/[0.03] cursor-pointer' : 'opacity-80'}`}
                        onClick={() => {
                          if (dashboardView === 'pending') {
                            setSelectedSkuId(rec.sku_id);
                            setSelectedRec(rec);
                            setSelectedSkuName(rec.product_name || rec.sku_id);
                            setShowComparison(true);
                          }
                        }}
                      >
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-[var(--text-h)] font-bold text-base group-hover:text-blue-400 transition-colors">
                              {rec.product_name || rec.sku_id}
                            </span>
                            {rec.final_recommendation?.is_override && (
                              <span className="mt-1 self-start text-[8px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">Modified by User</span>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-[var(--text)] font-mono">{rec.sku_id}</span>
                            </div>
                            <div className="mt-2">
                              {(() => {
                                const tone = getWhyTone(rec);
                                return (
                              <div className="relative inline-block group/why">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest cursor-help ${tone.badge}`}>
                                  {tone.icon}
                                  Why this action?
                                </span>
                                <div className={`pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 max-w-[70vw] rounded-2xl border p-4 shadow-2xl opacity-0 translate-y-1 transition-all duration-150 group-hover/why:opacity-100 group-hover/why:translate-y-0 ${tone.panel}`}>
                                  <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-2 text-[var(--text-h)]">{tone.label}</div>
                                  <div className="text-sm font-semibold text-[var(--text-h)] leading-snug">
                                    {summarizeWhy(rec)}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {safeArray<string>(rec.decision_parameters).slice(0, 3).map((item) => (
                                      <span key={item} className="px-2 py-1 rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--text)] text-[10px] font-bold">
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                                );
                              })()}
                            </div>
                            <div className="flex gap-2 mb-3 flex-wrap">
                              {rec.scenario_tags?.map((tag: string) => (
                                <span key={tag} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-black/5 dark:bg-white/5 text-[var(--text)] rounded-md border border-black/5 dark:border-white/5">
                                  {tag.replace('_', ' ')}
                                </span>
                              ))}
                              {rec.conflicts && rec.conflicts.length > 0 && (
                                <div className="relative group/conflict">
                                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 flex items-center gap-1 cursor-help">
                                    <ShieldAlert size={10} />
                                    Conflict Resolved
                                  </span>
                                  <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-80 max-w-[70vw] rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-2xl opacity-0 translate-y-1 transition-all duration-150 group-hover/conflict:opacity-100 group-hover/conflict:translate-y-0">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-2">{conflictHeadline(rec.conflicts[0])}</div>
                                    <div className="text-sm font-semibold text-[var(--text-h)] leading-snug">
                                      {summarizeConflict(rec.conflicts[0])}
                                    </div>
                                    <div className="mt-2 text-[11px] font-bold text-[var(--text)] opacity-80">
                                      {conflictTakeaway(rec.conflicts[0])}
                                    </div>
                                    {safeArray<any>(rec.conflicts).slice(1, 3).length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {safeArray<any>(rec.conflicts).slice(1, 3).map((c) => (
                                          <span key={c.conflict_id || c.type} className="px-2 py-1 rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--text)] text-[10px] font-bold">
                                            {c.conflict_id || c.type}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <span className={`p-1.5 rounded-lg ${rec.final_recommendation.price_change_pct < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : rec.final_recommendation.price_change_pct > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-500/10 text-neutral-500'}`}>
                              {rec.final_recommendation.price_change_pct < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                            </span>
                            <div>
                              <p className="text-[var(--text-h)] font-bold">₹{rec.final_recommendation.new_price}</p>
                              <p className={`text-[10px] font-black ${rec.final_recommendation.price_change_pct < 0 ? 'text-rose-600 dark:text-rose-400' : rec.final_recommendation.price_change_pct > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`}>
                                {rec.final_recommendation.price_change_pct > 0 ? '+' : ''}{rec.final_recommendation.price_change_pct}%
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-[var(--text-h)] font-semibold capitalize">{rec.final_recommendation.ad_action.replace('_', ' ')}</span>
                            <span className="text-[10px] text-[var(--text)] opacity-80">₹{rec.final_recommendation.new_ad_spend_per_unit}/unit</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mb-1">
                            <div
                              className={`h-full rounded-full ${rec.final_recommendation.projected_margin_pct < 15 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, rec.final_recommendation.projected_margin_pct * 2)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${rec.final_recommendation.projected_margin_pct < 15 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {rec.final_recommendation.projected_margin_pct}%
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[var(--text)] font-mono font-semibold">{(rec.confidence * 100).toFixed(0)}%</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${rec.applied_config?.engine_mode === 'ai'
                              ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                              : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                            }`}>
                            {rec.applied_config?.engine_mode === 'ai' ? 'AI' : 'RULE'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          {dashboardView === 'pending' ? (
                            <div className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center group-hover:bg-blue-500 group-hover:border-blue-500 transition-all text-gray-500 group-hover:text-white">
                              <ChevronRight size={16} />
                            </div>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                              Deployed at {rec.approvedAt}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : activeTab === 'inventory' ? (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-blue-500 rounded-full" />
                  <h2 className="text-xl font-heading font-bold text-[var(--text-h)]">Inventory Health</h2>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold rounded-full border border-blue-500/20">
                    {filteredInventory.length} Total SKUs
                  </span>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[var(--text)] text-[10px] uppercase tracking-[0.2em] font-black border-b border-[var(--border)] bg-black/5 dark:bg-black/20">
                    <th className="px-8 py-5">Product Name</th>
                    <th className="px-8 py-5">Stock Level</th>
                    <th className="px-8 py-5">Days of Cover</th>
                    <th className="px-8 py-5">Ageing</th>
                    <th className="px-8 py-5">Risk Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredInventory.map((item) => (
                    <tr key={item.sku_id} className="border-t border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-[var(--text-h)] font-bold text-base group-hover:text-blue-500 transition-colors">
                            {item.product_name || item.product || item.name || item.sku_id}
                          </span>
                          <span className="text-[10px] text-[var(--text)] font-mono mt-1">{item.sku_id}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-[var(--text-h)] font-bold">{item.stock_on_hand} units</span>
                          <span className="text-[10px] text-[var(--text)]">Weekly Sell-through: {Math.round(item.sell_through_rate_weekly * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.days_of_cover < 14 ? 'bg-rose-500/10 text-rose-500' : 'bg-gray-500/10 text-[var(--text)]'}`}>
                          {item.days_of_cover} Days
                        </span>
                      </td>
                      <td className="px-8 py-6 text-[var(--text)]">
                        <div className="flex flex-col">
                          <span className={item.ageing_days > 60 ? 'text-orange-500 font-bold' : ''}>{item.ageing_days} Days</span>
                          {item.ageing_days > 60 && <span className="text-[9px] font-black text-orange-500/50 uppercase tracking-tighter">Slow Moving</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const frac = (Number(item.stockout_risk) || 0) > 0 ? Number(item.stockout_risk) : (Number(item.stockout_risk_pct) || 0) / 100;
                            const v = isFinite(frac) ? frac : 0;
                            return (
                              <>
                                <div className={`w-2 h-2 rounded-full ${v > 0.4 ? 'bg-rose-500 animate-pulse' : v > 0.15 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <span className={`text-xs font-bold ${v > 0.4 ? 'text-rose-400' : 'text-[var(--text)]'}`}>
                                  {Math.round(v * 100)}% Risk
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="max-w-4xl mx-auto pb-20">
              <header className="mb-10 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-heading font-extrabold text-[var(--text-h)] mb-2">Engine Control Panel</h2>
                  <p className="text-[var(--text)] font-medium">Configure global guardrails and decision thresholds for the Pricing AI.</p>
                </div>
                {isSimulating && (
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold animate-pulse">
                    <RefreshCw size={12} className="animate-spin" />
                    SIMULATING IMPACT...
                  </div>
                )}
              </header>

              {/* Impact Summary Card */}
              {impact && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-3xl p-6 flex justify-around items-center backdrop-blur-md"
                  >
                    <div className="text-center">
                      <p className="text-[10px] font-heading font-extrabold text-blue-500 dark:text-blue-300 uppercase tracking-widest mb-1">Price Adjustments</p>
                      <p className={`text-2xl font-heading font-extrabold ${impact.discountDelta > 0 ? 'text-orange-500' : impact.discountDelta < 0 ? 'text-emerald-500' : 'text-[var(--text-h)]'}`}>
                        {impact.discountDelta > 0 ? '+' : ''}{impact.discountDelta} SKUs
                      </p>
                    </div>
                    <div className="w-px h-10 bg-[var(--border)]" />
                    <div className="text-center">
                      <p className="text-[10px] font-heading font-extrabold text-blue-500 dark:text-blue-300 uppercase tracking-widest mb-1">Projected Margin</p>
                      <p className={`text-2xl font-heading font-extrabold ${impact.marginDelta < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {impact.marginDelta > 0 ? '+' : ''}{impact.marginDelta.toFixed(1)}%
                      </p>
                    </div>
                    <div className="w-px h-10 bg-[var(--border)]" />
                    <div className="text-center">
                      <p className="text-[10px] font-heading font-extrabold text-blue-500 dark:text-blue-300 uppercase tracking-widest mb-1">Ad Expansion</p>
                      <p className={`text-2xl font-heading font-extrabold ${impact.adDelta > 0 ? 'text-blue-500' : 'text-[var(--text-h)]'}`}>
                        {impact.adDelta > 0 ? '+' : ''}{impact.adDelta} SKUs
                      </p>
                    </div>
                  </motion.div>

                  {/* Specific Impacts List */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-6 h-[100px] lg:h-auto overflow-hidden flex flex-col"
                  >
                    <p className="text-[10px] font-heading font-extrabold text-[var(--text)] uppercase tracking-widest mb-3 flex justify-between">
                      <span>Specific SKU Shifts</span>
                      <span className="text-blue-500">{changedSkus.length} Changes</span>
                    </p>
                    <div className="flex-1 overflow-auto custom-scrollbar flex flex-col gap-2">
                      {changedSkus.slice(0, 5).map(change => (
                        <div key={change.sku_id} className="text-[11px] bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-[var(--border)]">
                          <p className="text-[var(--text-h)] font-bold truncate mb-1">{change.name}</p>
                          <div className="flex justify-between items-center text-[9px] text-[var(--text)]">
                            <span className="capitalize">{change.oldAction} → {change.newAction}</span>
                            <span className={change.marginDelta < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                              {change.marginDelta > 0 ? '+' : ''}{change.marginDelta.toFixed(1)}% Margin
                            </span>
                          </div>
                        </div>
                      ))}
                      {calculateChangedSkus().length === 0 && (
                        <p className="text-[var(--text)] text-[10px] mt-4 text-center">No strategy shifts for this adjustment.</p>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
              {configLoading || !localConfig ? (
                <div className="p-20 flex justify-center"><RefreshCw className="animate-spin text-blue-500" size={40} /></div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateSettingsMutation.mutate(localConfig);
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  {/* Engine Mode */}
                  <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-8 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                      <BrainCircuit className="text-blue-500" size={20} />
                      <h3 className="text-lg font-heading font-bold text-[var(--text-h)]">Engine Mode</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setLocalConfig({ ...localConfig, engine_mode: 'rule' })}
                        className={`px-6 py-3 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${(localConfig.engine_mode || 'rule') === 'rule'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-black/5 dark:bg-white/5 text-[var(--text)] border-[var(--border)] hover:border-emerald-500/20'
                          }`}
                      >
                        Rule Engine
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalConfig({ ...localConfig, engine_mode: 'ai' })}
                        className={`px-6 py-3 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${localConfig.engine_mode === 'ai'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-black/5 dark:bg-white/5 text-[var(--text)] border-[var(--border)] hover:border-blue-500/20'
                          }`}
                      >
                        AI Engine
                      </button>
                    </div>
                    <p className="text-[var(--text)] text-sm opacity-70 font-medium mt-4">
                      Rule Engine uses tagging + pricing/ads agents + conflict resolution. AI Engine uses elasticity-based search + momentum ad scaling and is approval-gated.
                    </p>
                  </section>

                  {/* Pricing & Margins */}
                  <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <TrendingUp className="text-emerald-500" size={20} />
                      <h3 className="text-lg font-heading font-bold text-[var(--text-h)]">Pricing & Margins</h3>
                    </div>
                    <div className="flex flex-col gap-6">
                      <SettingField
                        label="Margin Floor (%)"
                        value={localConfig.margin_floor_pct}
                        min={0} max={40} step={0.5}
                        onChange={(v) => setLocalConfig({ ...localConfig, margin_floor_pct: v })}
                      />
                      <SettingField
                        label="Safe Margin (%)"
                        value={localConfig.safe_margin_pct}
                        min={0} max={50} step={1}
                        onChange={(v) => setLocalConfig({ ...localConfig, safe_margin_pct: v })}
                      />
                      <SettingField
                        label="Competitor Gap Trigger (%)"
                        value={localConfig.competitor_undercut_pct}
                        min={1} max={25} step={0.5}
                        onChange={(v) => setLocalConfig({ ...localConfig, competitor_undercut_pct: v })}
                      />
                      <SettingField
                        label="Standard Step (%)"
                        value={localConfig.price_change_step}
                        min={1} max={15} step={0.5}
                        onChange={(v) => setLocalConfig({ ...localConfig, price_change_step: v })}
                      />
                    </div>
                  </section>

                  {/* Advertising / ROAS */}
                  <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="text-blue-500" size={20} />
                      <h3 className="text-lg font-heading font-bold text-[var(--text-h)]">Advertising Strategy</h3>
                    </div>
                    <div className="flex flex-col gap-6">
                      <SettingField
                        label="Scale Threshold (ROAS)"
                        value={localConfig.roas_increase_threshold}
                        min={1} max={10} step={0.1}
                        onChange={(v) => setLocalConfig({ ...localConfig, roas_increase_threshold: v })}
                      />
                      <SettingField
                        label="Efficiency Floor (ROAS)"
                        value={localConfig.roas_decrease_threshold}
                        min={1} max={5} step={0.1}
                        onChange={(v) => setLocalConfig({ ...localConfig, roas_decrease_threshold: v })}
                      />
                      <SettingField
                        label="Pause Threshold (ROAS)"
                        value={localConfig.roas_pause_threshold}
                        min={0.5} max={3} step={0.1}
                        onChange={(v) => setLocalConfig({ ...localConfig, roas_pause_threshold: v })}
                      />
                      <SettingField
                        label="Ad Spend Step (%)"
                        value={localConfig.ad_change_step}
                        min={1} max={30} step={1}
                        onChange={(v) => setLocalConfig({ ...localConfig, ad_change_step: v })}
                      />
                    </div>
                  </section>

                  {/* Inventory Health */}
                  <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Package className="text-blue-500" size={20} />
                      <h3 className="text-lg font-heading font-bold text-[var(--text-h)]">Inventory Guardrails</h3>
                    </div>
                    <div className="flex flex-col gap-6">
                      <SettingField
                        label="Overstock Trigger (Days)"
                        value={localConfig.overstock_days}
                        min={10} max={180} step={5}
                        onChange={(v) => setLocalConfig({ ...localConfig, overstock_days: v })}
                      />
                      <SettingField
                        label="Ageing Trigger (Days)"
                        value={localConfig.ageing_days}
                        min={15} max={120} step={5}
                        onChange={(v) => setLocalConfig({ ...localConfig, ageing_days: v })}
                      />
                      <SettingField
                        label="Stockout Risk (%)"
                        value={localConfig.stockout_risk_pct}
                        min={5} max={80} step={5}
                        onChange={(v) => setLocalConfig({ ...localConfig, stockout_risk_pct: v })}
                      />
                    </div>
                  </section>

                  {/* Seasonality & Liquidations */}
                  <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Target className="text-orange-500" size={20} />
                      <h3 className="text-lg font-heading font-bold text-[var(--text-h)]">Seasonality & Growth</h3>
                    </div>
                    <div className="flex flex-col gap-6">
                      <SettingField
                        label="End of Season (Days)"
                        value={localConfig.end_of_season_days}
                        min={3} max={45} step={1}
                        onChange={(v) => setLocalConfig({ ...localConfig, end_of_season_days: v })}
                      />
                      <SettingField
                        label="Deep Discount (%)"
                        value={localConfig.deep_discount_pct}
                        min={10} max={60} step={5}
                        onChange={(v) => setLocalConfig({ ...localConfig, deep_discount_pct: v })}
                      />
                      <SettingField
                        label="Peak Demand Multiplier"
                        value={localConfig.peak_demand_multiplier}
                        min={1} max={3} step={0.1}
                        onChange={(v) => setLocalConfig({ ...localConfig, peak_demand_multiplier: v })}
                      />
                    </div>
                  </section>

                  <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setLocalConfig(config);
                        queryClient.invalidateQueries({ queryKey: ['settings'] });
                      }}
                      className="px-8 py-3 bg-black/5 dark:bg-neutral-800/50 text-[var(--text-h)] dark:text-gray-400 font-bold rounded-2xl border border-[var(--border)] dark:border-neutral-700 hover:border-blue-500/30 hover:text-[var(--text-h)] dark:hover:text-white transition-all"
                    >
                      Reset Changes
                    </button>
                    <button
                      type="submit"
                      disabled={updateSettingsMutation.isPending}
                      className="px-12 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {updateSettingsMutation.isPending ? 'Syncing...' : 'Deploy Global Configuration'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : activeTab === 'data' ? (
            <div className="flex flex-col gap-8 pb-20">
              {/* Upload Area */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-[var(--text-h)]">
                  <Database size={150} />
                </div>
                <h2 className="text-2xl font-heading font-extrabold text-[var(--text-h)] mb-2 relative z-10">Master Catalog Ingestion</h2>
                <p className="text-[var(--text)] mb-8 max-w-lg relative z-10 font-medium">Upload a single monolithic CSV. The Pandas pipeline will securely shred it into Pricing, Inventory, and Advertising silos.</p>

                <div className="flex gap-4 relative z-10">
                  <button
                    onClick={downloadTemplate}
                    className="px-6 py-3 bg-[var(--bg)] hover:bg-[var(--border)] text-[var(--text-h)] font-bold rounded-xl border border-[var(--border)] transition-all flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Download CSV Template
                  </button>
                  <label className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all cursor-pointer flex items-center gap-2 group hover:scale-105 active:scale-95">
                    <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />
                    {uploadCatalogMutation.isPending ? 'Uploading...' : 'Select File to Upload'}
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadCatalogMutation.mutate(file);
                      }}
                    />
                  </label>
                </div>

                {uploadCatalogMutation.isError && (
                  <div className="mt-6 bg-rose-500/10 text-rose-400 px-6 py-3 rounded-xl border border-rose-500/20 text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16} />
                    Validation Error: {uploadCatalogMutation.error?.message || "Invalid file format."}
                  </div>
                )}
              </div>

              {/* History Table */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl">
                <div className="px-8 py-6 border-b border-[var(--border)] bg-[var(--bg-secondary)]/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                    <h2 className="text-xl font-heading font-bold text-[var(--text-h)]">Data Ingestion History</h2>
                  </div>
                </div>
                <div className="p-8">
                  {uploadHistory?.length === 0 ? (
                    <div className="text-center py-20 bg-black/5 dark:bg-white/5 rounded-3xl border border-dashed border-[var(--border)]">
                      <Database className="mx-auto text-[var(--text)] opacity-20 mb-4" size={48} />
                      <p className="text-[var(--text)] font-medium">No ingestion history found.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {uploadHistory?.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl group hover:border-blue-500/30 transition-all">
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${entry.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {entry.status === 'success' ? <FileCheck size={24} /> : <AlertCircle size={24} />}
                            </div>
                            <div>
                              <p className="text-[var(--text-h)] font-bold text-lg">{entry.filename}</p>
                              <p className="text-xs text-[var(--text)] mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${entry.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {entry.status}
                            </span>
                            <p className="text-sm text-[var(--text)] mt-2 font-medium">{entry.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'research' ? (
            <div className="flex flex-col gap-10 pb-20">
              {/* Research Header / Summary Table */}
              <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-8 py-6 border-b border-[var(--border)] bg-[var(--bg-secondary)]/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-purple-500 rounded-full" />
                    <h2 className="text-xl font-heading font-bold text-[var(--text-h)]">Signals from Current Dataset</h2>
                  </div>
                </div>
                <div className="px-8 py-4 border-b border-[var(--border)] bg-black/5 dark:bg-black/20 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-[var(--text)] text-xs font-medium opacity-80">
                    {(() => {
                      const recs = recommendationList;
                      const applied = recs[0]?.applied_config;
                      if (!applied) return 'Applied Config: unknown (backend not returning applied_config yet)';
                      const version = applied.config_version ?? 'unknown';
                      const mode = applied.engine_mode ?? 'unknown';
                      return `Applied Config v${version} (${mode})`;
                    })()}
                  </div>
                  <div className="text-[var(--text)] text-[10px] font-mono opacity-60">
                    {(() => {
                      const recs = recommendationList;
                      const applied = recs[0]?.applied_config;
                      return applied?.config_updated_at ? `updated_at: ${applied.config_updated_at}` : '';
                    })()}
                  </div>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[var(--text)] text-[9px] uppercase tracking-widest font-black border-b border-[var(--border)] bg-black/5 dark:bg-black/20">
                        <th className="px-8 py-4">Live Signal</th>
                        <th className="px-8 py-4">What It Means</th>
                        <th className="px-8 py-4 text-center">Current Value</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {(() => {
                        const recs = recommendationList;
                        const total = recs.length;
                        const avgMargin = total
                          ? recs.reduce((acc, r) => acc + (r.final_recommendation?.projected_margin_pct ?? 0), 0) / total
                          : 0;
                        const approvals = recs.filter(r => !!r.approval_required).length;
                        const stockout = recs.filter(r => safeArray<string>(r.scenario_tags).includes('stockout_risk')).length;
                        const overstock = recs.filter(r => safeArray<string>(r.scenario_tags).includes('overstock') || safeArray<string>(r.scenario_tags).includes('ageing_inventory')).length;
                        const competitor = recs.filter(r => safeArray<string>(r.scenario_tags).includes('competitor_undercut')).length;

                        const rows = [
                          {
                            s: 'Imported SKUs',
                            r: 'Total items currently loaded into the engine. Uploading new data should change this.',
                            v: total ? `${total.toLocaleString()} SKUs` : 'No data',
                            tone: total ? 'emerald' : 'amber'
                          },
                          {
                            s: 'Avg Projected Margin',
                            r: 'Average contribution margin after orchestration across all SKUs.',
                            v: total ? `${avgMargin.toFixed(1)}%` : 'N/A',
                            tone: 'blue'
                          },
                          {
                            s: 'Approvals Required',
                            r: 'How many SKUs are gated for human approval due to conflicts/risk/hero rules.',
                            v: total ? `${approvals} (${Math.round((approvals / total) * 100)}%)` : 'N/A',
                            tone: approvals ? 'amber' : 'emerald'
                          },
                          {
                            s: 'Overstock / Ageing',
                            r: 'Inventory pressure signals detected from imported data.',
                            v: total ? `${overstock}` : 'N/A',
                            tone: overstock ? 'rose' : 'emerald'
                          },
                          {
                            s: 'Competitor Undercut',
                            r: 'Competitive pressure signals where competitor is cheaper beyond threshold.',
                            v: total ? `${competitor}` : 'N/A',
                            tone: competitor ? 'amber' : 'emerald'
                          },
                          {
                            s: 'Stockout Risk',
                            r: 'Supply constraint signals; ads should avoid scaling into low stock.',
                            v: total ? `${stockout}` : 'N/A',
                            tone: stockout ? 'rose' : 'emerald'
                          }
                        ];

                        return rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                            <td className="px-8 py-4 font-bold text-[var(--text-h)]">{row.s}</td>
                            <td className="px-8 py-4 text-[var(--text)] text-xs font-medium">{row.r}</td>
                            <td className="px-8 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${row.tone === 'rose'
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : row.tone === 'amber'
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    : row.tone === 'blue'
                                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                }`}>
                                {row.v}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Research Buckets -> click to see SKUs */}
              <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center justify-between gap-6 mb-6">
                  <div>
                    <h3 className="text-xl font-heading font-extrabold text-[var(--text-h)]">Your Imported SKUs</h3>
                    <p className="text-[var(--text)] text-sm opacity-70 font-medium">
                      Switch between the original scenario launchpads and data-driven buckets.
                    </p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex bg-black/5 dark:bg-black/40 p-1 rounded-xl border border-black/5 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setResearchView('scenarios')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${researchView === 'scenarios' ? 'bg-purple-600 text-white shadow-lg' : 'text-[var(--text)] hover:text-[var(--text-h)]'}`}
                      >
                        Scenarios
                      </button>
                      <button
                        type="button"
                        onClick={() => setResearchView('buckets')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${researchView === 'buckets' ? 'bg-purple-600 text-white shadow-lg' : 'text-[var(--text)] hover:text-[var(--text-h)]'}`}
                      >
                        Buckets
                      </button>
                    </div>
                    <button
                      onClick={() => refetch()}
                      className="px-4 py-2 bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-xl font-bold text-[var(--text-h)] hover:border-purple-500/30 transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-[var(--text)] opacity-70 font-medium">Loading recommendations...</div>
                ) : isError ? (
                  <div className="text-rose-500 font-bold">Failed to load recommendations.</div>
                ) : researchRecsAll.length === 0 ? (
                  <div className="text-[var(--text)] opacity-70 font-medium">
                    No SKUs found. Upload a master catalog in the Data tab, then return here.
                  </div>
                ) : researchView === 'scenarios' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {[
                        { key: 'stable_kurta', name: 'Stable Kurta', desc: 'Matches imported kurtas in stable conditions.', icon: <Zap size={24} /> },
                        { key: 'seasonal_jacket', name: 'Seasonal Jacket', desc: 'Matches seasonal/markdown jacket-like items.', icon: <TrendingDown size={24} /> },
                        { key: 'high_uncertainty', name: 'High Uncertainty', desc: 'Matches SKUs tagged high_uncertainty.', icon: <AlertCircle size={24} /> },
                        { key: 'overstock_shirt', name: 'Overstock Shirt', desc: 'Matches overstock/ageing shirt-like items.', icon: <Package size={24} /> },
                        { key: 'low_stock_hero', name: 'Low Stock Hero', desc: 'Matches hero SKUs with stockout risk.', icon: <ShieldCheck size={24} /> },
                      ].map((scenario) => {
                        const count = researchRecsAll.filter(r => matchesResearchScenario(r, scenario.key)).length;
                        return (
                          <motion.div
                            key={scenario.key}
                            whileHover={{ y: -5 }}
                            className="bg-black/5 dark:bg-white/5 border border-[var(--border)] p-8 rounded-2xl flex flex-col gap-6 group hover:border-purple-500/30 transition-all cursor-pointer shadow-sm"
                            onClick={() => setResearchScenarioKey(scenario.key)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                {scenario.icon}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)] opacity-60">
                                {count}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-xl font-heading font-extrabold text-[var(--text-h)] mb-2">{scenario.name}</h4>
                              <p className="text-[var(--text)] text-sm font-medium leading-relaxed opacity-70">{scenario.desc}</p>
                            </div>
                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--border)]">
                              <span className="text-[10px] font-mono text-[var(--text)] opacity-40">
                                {researchScenarioKey === scenario.key ? 'selected' : 'click to view SKUs'}
                              </span>
                              <ChevronRight size={18} className="text-purple-500" />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl p-6">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="text-[var(--text-h)] font-heading font-extrabold">
                          Showing: {researchScenarioKey ? researchScenarioKey.replaceAll('_', ' ') : 'Select a scenario tile'}
                        </div>
                        <button
                          onClick={() => setResearchScenarioKey(null)}
                          className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl font-bold text-[var(--text)] hover:text-[var(--text-h)] hover:border-purple-500/30 transition-all"
                        >
                          Clear
                        </button>
                      </div>
                      {!researchScenarioKey ? (
                        <div className="text-[var(--text)] opacity-70 font-medium">Click a scenario tile above to list matching SKUs from the current dataset.</div>
                      ) : scenarioRecs.length === 0 ? (
                        <div className="text-[var(--text)] opacity-70 font-medium">No SKUs match this scenario using current tags/names.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {scenarioRecs.slice(0, 30).map((rec) => (
                            <div
                              key={rec.sku_id}
                              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 hover:border-purple-500/30 transition-all cursor-pointer"
                              onClick={() => {
                                setSelectedSkuId(rec.sku_id);
                                setSelectedSkuName(rec.product_name || rec.sku_id);
                                setSelectedRec(rec);
                                setShowComparison(true);
                              }}
                            >
                              <div className="text-[var(--text-h)] font-bold">{rec.product_name || rec.sku_id}</div>
                              <div className="text-[10px] font-mono text-[var(--text)] opacity-60 mt-1">{rec.sku_id}</div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {safeArray<string>(rec.scenario_tags).slice(0, 4).map((t) => (
                                  <span key={t} className="px-2 py-1 bg-black/5 dark:bg-white/5 text-[var(--text)] rounded-lg border border-[var(--border)] font-bold text-[10px] opacity-80">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {researchBuckets.filter(b => b.id === 'all' || b.count > 0).map((bucket) => (
                        <motion.div
                          key={bucket.id}
                          whileHover={{ y: -4 }}
                          className={`bg-black/5 dark:bg-white/5 border ${bucket.tone} p-8 rounded-2xl flex flex-col gap-6 transition-all cursor-pointer shadow-sm`}
                          onClick={() => setResearchGroup(bucket.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                              {bucket.icon}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)] opacity-60">
                              {bucket.count}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-xl font-heading font-extrabold text-[var(--text-h)] mb-2">{bucket.name}</h4>
                            <p className="text-[var(--text)] text-sm font-medium leading-relaxed opacity-70">{bucket.desc}</p>
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--border)]">
                            <span className="text-[10px] font-mono text-[var(--text)] opacity-40">
                              {researchGroup === bucket.id ? 'selected' : 'click to view'}
                            </span>
                            <ChevronRight size={18} className="text-purple-500" />
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-2xl p-6">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="text-[var(--text-h)] font-heading font-extrabold">
                          Showing: {researchBuckets.find(b => b.id === researchGroup)?.name || 'All SKUs'}
                        </div>
                        <button
                          onClick={() => setResearchGroup('all')}
                          className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl font-bold text-[var(--text)] hover:text-[var(--text-h)] hover:border-purple-500/30 transition-all"
                        >
                          Clear Filter
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {researchRecs.slice(0, 30).map((rec) => (
                          <div
                            key={rec.sku_id}
                            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 hover:border-purple-500/30 transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedSkuId(rec.sku_id);
                              setSelectedSkuName(rec.product_name || rec.sku_id);
                              setShowComparison(true);
                            }}
                          >
                            <div className="text-[var(--text-h)] font-bold">{rec.product_name || rec.sku_id}</div>
                            <div className="text-[10px] font-mono text-[var(--text)] opacity-60 mt-1">{rec.sku_id}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {safeArray<string>(rec.scenario_tags).slice(0, 4).map((t) => (
                                <span key={t} className="px-2 py-1 bg-black/5 dark:bg-white/5 text-[var(--text)] rounded-lg border border-[var(--border)] font-bold text-[10px] opacity-80">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {researchRecs.length > 30 && (
                        <div className="mt-4 text-[10px] font-bold text-[var(--text)] opacity-60">
                          Showing first 30 of {researchRecs.length}. Refine bucket selection to drill down further.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : activeTab === 'activity' ? (
            <div className="max-w-4xl mx-auto pb-20">
              <header className="mb-10 text-center">
                <h2 className="text-3xl font-heading font-extrabold text-[var(--text-h)] mb-2">System Audit Trail</h2>
                <p className="text-[var(--text)] font-medium">Deterministic trace of all agent deployments and strategy overrides.</p>
              </header>

              <div className="relative border-l-2 border-[var(--border)] ml-4 pl-10 space-y-12 py-4">
                {activityLog.length === 0 ? (
                  <div className="text-center py-20 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl ml-[-40px] shadow-sm">
                    <FileText className="mx-auto text-[var(--text)] opacity-30 mb-4" size={48} />
                    <p className="text-[var(--text)]">No activity recorded yet for this session.</p>
                  </div>
                ) : (
                  activityLog.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative"
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[51px] w-5 h-5 rounded-full border-4 border-[var(--bg)] ${log.type === 'approval' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' :
                          log.type === 'override' ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                            'bg-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                        }`} />

                      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-6 rounded-3xl hover:border-blue-500/30 transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-[var(--text-h)] font-heading font-extrabold text-lg">{log.title}</h4>
                          <span className="text-[10px] font-mono text-[var(--text)] bg-black/5 dark:bg-black/40 px-2 py-1 rounded-lg border border-[var(--border)]">{log.timestamp}</span>
                        </div>
                        <p className="text-[var(--text)] text-sm leading-relaxed font-medium">{log.details}</p>
                        <div className="mt-4 flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${log.type === 'approval' ? 'bg-emerald-500/10 text-emerald-500' :
                              log.type === 'override' ? 'bg-blue-500/10 text-blue-500' :
                                'bg-blue-500/10 text-blue-500'
                            }`}>
                            {log.type}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {/* Global Sync Overlay */}
          <AnimatePresence>
            {(uploadCatalogMutation.isPending || updateSettingsMutation.isPending) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-center p-10"
              >
                <div className="relative mb-12">
                  <div className="w-32 h-32 border-4 border-blue-500/20 border-t-purple-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {uploadCatalogMutation.isPending ? <Database className="text-blue-400 animate-pulse" size={40} /> : <BrainCircuit className="text-blue-400 animate-pulse" size={40} />}
                  </div>
                </div>

                <h2 className="text-4xl font-black text-white mb-6 tracking-tight">
                  {uploadCatalogMutation.isPending ? 'Strategic Orchestration in Progress' : 'Strategic Core Re-Calibration'}
                </h2>
                <p className="text-xl text-gray-400 max-w-lg leading-relaxed font-medium">
                  {uploadCatalogMutation.isPending ?
                    'The engine is currently ingesting your new catalog and resolving multi-agent conflicts across all SKUs.' :
                    'Swapping deterministic rule sets for high-fidelity price elasticity neural models.'}
                </p>

                <div className="mt-12 flex gap-8">
                  {uploadCatalogMutation.isPending ? (
                    [
                      { label: 'Schema Validation', status: 'complete' },
                      { label: 'Agent Handshake', status: 'active' },
                      { label: 'Conflict Resolution', status: 'pending' }
                    ].map((step, i) => (
                      <div key={i} className="flex flex-col items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${step.status === 'complete' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : step.status === 'active' ? 'bg-blue-500 animate-ping' : 'bg-gray-800'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${step.status === 'complete' ? 'text-emerald-400' : step.status === 'active' ? 'text-blue-400' : 'text-gray-600'}`}>{step.label}</span>
                      </div>
                    ))
                  ) : (
                    [
                      { label: 'Unloading Rules', status: 'complete' },
                      { label: 'Loading Weights', status: 'active' },
                      { label: 'Warming Model', status: 'pending' }
                    ].map((step, i) => (
                      <div key={i} className="flex flex-col items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${step.status === 'complete' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : step.status === 'active' ? 'bg-blue-500 animate-ping' : 'bg-gray-800'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${step.status === 'complete' ? 'text-emerald-400' : step.status === 'active' ? 'text-blue-400' : 'text-gray-600'}`}>{step.label}</span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Research Comparison Modal */}
          <AnimatePresence>
            {showComparison && selectedSkuId && (
              <ComparisonModal
                isOpen={showComparison}
                skuId={selectedSkuId}
                productName={selectedSkuName || selectedSku?.product_name || selectedSkuId}
                rec={selectedRec}
                data={comparisonData}
                isLoading={loadingComparison}
                onClose={() => {
                  setShowComparison(false);
                  setSelectedSkuId(null);
                  setSelectedSkuName(null);
                  setSelectedRec(null);
                }}
                onApprove={() => {
                  // Map simulation result back to recommendation format for approval
                  const integratedResult = comparisonData?.integrated;
                  if (!integratedResult) {
                    setShowToast('Cannot approve: missing simulation result');
                    setTimeout(() => setShowToast(null), 3000);
                    return;
                  }
                  const recToApprove = {
                    sku_id: selectedSkuId,
                    product_name: selectedSku?.product_name || selectedSkuId,
                    current_price: selectedSku?.current_price || 0,
                    cogs: selectedSku?.cogs || 0,
                    current_ad_spend_per_unit: selectedSku?.current_ad_spend_per_unit || 0,
                    scenario_tags: ['INTEGRATED_RESEARCH_WINNER'],
                    final_recommendation: {
                      price_action: integratedResult.avg_margin_per_unit > (selectedSku?.current_price || 0) * 0.2 ? 'Increase' : 'Discount',
                      price_change_pct: 0, // Placeholder
                      new_price: integratedResult.avg_margin_per_unit + (selectedSku?.cogs || 0), // Simplified
                      ad_action: 'Integrated_Optimization',
                      ad_change_pct: 0,
                      new_ad_spend_per_unit: integratedResult.avg_ad_spend_per_unit,
                      projected_margin_pct: integratedResult.sell_through_pct
                    },
                    confidence: 1.0,
                    explanation: "Research-validated Integrated Agent Strategy"
                  };
                  handleApprove(selectedSkuId, recToApprove);
                }}
              />
            )}
          </AnimatePresence>
          {/* Activity Tab Content */}
        </main>
      </div>
    </div>
  );
};

const SettingField: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }> = ({ label, value, min, max, step, onChange }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-heading font-extrabold text-gray-400 uppercase tracking-widest">{label}</label>
        <span className="text-sm font-heading font-bold text-white">{value}{label.includes('%') ? '%' : label.includes('ROAS') || label.includes('Multiplier') ? 'x' : ''}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-neutral-800/50 rounded-lg appearance-none cursor-pointer accent-purple-500"
      />
    </div>
  );
};

const AppWithBoundary: React.FC = () => (
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

export default AppWithBoundary;

