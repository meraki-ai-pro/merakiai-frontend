'use client';

import { useEffect, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { LlmModeConfig, LlmModeUsage } from '@/services/adminApi';
import {
  SlidersHorizontal,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  BookOpen,
  FlaskConical,
  ClipboardCheck,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MODE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  learn:             { label: 'Learn',             icon: BookOpen,       color: 'text-blue-400' },
  application:       { label: 'Practice',          icon: FlaskConical,   color: 'text-emerald-400' },
  review:            { label: 'Review',            icon: ClipboardCheck, color: 'text-amber-400' },
  review_generation: { label: 'Review Generation', icon: Sparkles,       color: 'text-fuchsia-400' },
};

const MODE_ORDER = ['learn', 'application', 'review', 'review_generation'];

function shortModel(m: string): string {
  return m.replace(/^claude-/, '').replace(/-\d{8}$/, '');
}

function ModeCard({
  mode,
  config,
  isDefault,
  models,
  usage,
}: {
  mode: string;
  config: LlmModeConfig;
  isDefault: boolean;
  models: string[];
  usage?: LlmModeUsage;
}) {
  const [model, setModel] = useState(config.model);
  const [temperature, setTemperature] = useState(config.temperature);
  const [maxTokens, setMaxTokens] = useState(config.max_tokens);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const dirty =
    model !== config.model ||
    temperature !== config.temperature ||
    maxTokens !== config.max_tokens;

  const meta = MODE_META[mode] ?? { label: mode, icon: Cpu, color: 'text-slate-400' };
  const Icon = meta.icon;

  const save = async () => {
    setSaving(true);
    setResult(null);
    const res = await adminApiClient.updateLlmMode(mode, {
      model,
      temperature,
      max_tokens: maxTokens,
    });
    if (res.success && res.data) {
      // Mutate the source config so `dirty` resets without a full reload.
      config.model = res.data.config.model;
      config.temperature = res.data.config.temperature;
      config.max_tokens = res.data.config.max_tokens;
      setResult({ ok: true, msg: 'Saved.' });
    } else {
      setResult({ ok: false, msg: res.error?.message ?? 'Save failed.' });
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', meta.color)} />
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{meta.label}</h3>
          <span className="rounded-md px-2 py-0.5 text-[10px] font-medium bg-white/70 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
            {isDefault ? 'Default' : 'Customized'}
          </span>
        </div>
        {usage && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {usage.total_requests} reqs · {usage.avg_ai_ms != null ? `${Math.round(usage.avg_ai_ms / 100) / 10}s avg` : '—'}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06] px-3 py-2 text-xs text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:focus:ring-cyan-300/[0.16]"
          >
            {(models.includes(model) ? models : [model, ...models]).map((m) => (
              <option key={m} value={m}>{shortModel(m)}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-slate-500 dark:text-slate-400">Temperature</label>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 tabular-nums">{temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-blue-600 dark:accent-cyan-300"
          />
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Max tokens (1–8192)</label>
          <input
            type="number"
            min={1}
            max={8192}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Math.max(1, Math.min(8192, parseInt(e.target.value) || 1)))}
            className="w-full rounded-lg border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06] px-3 py-2 text-xs font-mono text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:focus:ring-cyan-300/[0.16]"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {result ? (
          <span className={cn('flex items-center gap-1.5 text-[11px]', result.ok ? 'text-emerald-400' : 'text-red-400')}>
            {result.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {result.msg}
          </span>
        ) : <span />}
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </button>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const [config, setConfig] = useState<Record<string, LlmModeConfig> | null>(null);
  const [defaults, setDefaults] = useState<Record<string, LlmModeConfig>>({});
  const [models, setModels] = useState<string[]>([]);
  const [usage, setUsage] = useState<Record<string, LlmModeUsage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [cfgRes, usageRes] = await Promise.allSettled([
      adminApiClient.getLlmConfig(),
      adminApiClient.getLlmUsage(30),
    ]);
    if (cfgRes.status === 'fulfilled' && cfgRes.value.success && cfgRes.value.data) {
      setConfig(cfgRes.value.data.config);
      setDefaults(cfgRes.value.data.defaults);
      setModels(cfgRes.value.data.available_models);
      setError(null);
    } else {
      setError(
        (cfgRes.status === 'fulfilled' && cfgRes.value.error?.message) || 'Failed to load LLM configuration'
      );
    }
    if (usageRes.status === 'fulfilled' && usageRes.value.success && usageRes.value.data) {
      setUsage(usageRes.value.data.by_mode);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isDefault = (mode: string, cfg: LlmModeConfig): boolean => {
    const d = defaults[mode];
    return !!d && d.model === cfg.model && d.temperature === cfg.temperature && d.max_tokens === cfg.max_tokens;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-cyan-200" />
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">LLM Configuration</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Per-mode model, temperature and token limits. Changes persist server-side and apply on the next request.</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <XCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      ) : config ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MODE_ORDER.filter((m) => config[m]).map((mode) => (
            <ModeCard
              key={mode}
              mode={mode}
              config={config[mode]}
              isDefault={isDefault(mode, config[mode])}
              models={models}
              usage={usage[mode]}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
