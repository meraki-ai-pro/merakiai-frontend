'use client';

import { useEffect, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { MediaKeyStatus } from '@/services/adminApi';
import {
  Video,
  Mic,
  Cpu,
  Cloud,
  CheckCircle2,
  Info,
  Zap,
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function InfoCard({
  icon: Icon,
  iconColor,
  title,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={cn('rounded-lg p-2', iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ServiceRow({
  label,
  value,
  status = 'active',
}: {
  label: string;
  value: string;
  status?: 'active' | 'fallback' | 'inactive';
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-200/70 dark:border-white/10 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-900 dark:text-white font-medium">{value}</span>
        {status === 'active' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
        {status === 'fallback' && <Zap className="h-3 w-3 text-amber-400" />}
      </div>
    </div>
  );
}

// ─── Editable API key row ─────────────────────────────────────────────────────
function SourceBadge({ source }: { source: MediaKeyStatus['source'] }) {
  const map = {
    override: { label: 'Custom', cls: 'bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200' },
    env:      { label: 'From .env', cls: 'bg-emerald-500/10 text-emerald-400' },
    unset:    { label: 'Not set', cls: 'bg-red-500/10 text-red-400' },
  } as const;
  const cfg = map[source];
  return <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium', cfg.cls)}>{cfg.label}</span>;
}

function KeyRow({ item, onSaved }: { item: MediaKeyStatus; onSaved: (keys: MediaKeyStatus[]) => void }) {
  const [value, setValue] = useState('');
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const save = async (clear = false) => {
    setSaving(true);
    setResult(null);
    const res = await adminApiClient.updateMediaKeys({ [item.name]: clear ? '' : value.trim() });
    if (res.success && res.data) {
      setValue('');
      setResult({ ok: true, msg: clear ? 'Reverted to .env value.' : 'API key updated.' });
      onSaved(res.data.keys);
    } else {
      setResult({ ok: false, msg: res.error?.message ?? 'Update failed.' });
    }
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-slate-200/70 dark:border-white/10 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-950 dark:text-white">{item.label}</p>
            <SourceBadge source={item.source} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.service}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Current</p>
          <p className="font-mono text-xs text-slate-700 dark:text-slate-300">{item.masked ?? '—'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={reveal ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`New ${item.label}…`}
            autoComplete="off"
            className="w-full rounded-lg border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06] pl-3 pr-9 py-2 text-xs font-mono text-slate-950 dark:text-white placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:focus:ring-cyan-300/[0.16]"
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title={reveal ? 'Hide' : 'Show'}
          >
            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <button
          onClick={() => save(false)}
          disabled={saving || !value.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          Save
        </button>
        {item.source === 'override' && (
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-lg border border-slate-200/80 dark:border-white/10 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-40"
            title="Remove custom key and use the .env value"
          >
            Revert
          </button>
        )}
      </div>

      {result && (
        <div className={cn('mt-2 flex items-center gap-1.5 text-[11px]', result.ok ? 'text-emerald-400' : 'text-red-400')}>
          {result.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {result.msg}
        </div>
      )}
    </div>
  );
}

function MediaKeysPanel() {
  const [keys, setKeys] = useState<MediaKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminApiClient.getMediaKeys();
    if (res.success && res.data) {
      setKeys(res.data.keys);
      setError(null);
    } else {
      setError(res.error?.message ?? 'Failed to load media keys');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Media Service API Keys</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Rotate provider keys without touching the server</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <XCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <KeyRow key={k.name} item={k} onSaved={setKeys} />
          ))}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-cyan-300/[0.2] dark:bg-cyan-300/[0.08]">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-700 dark:text-cyan-200" />
            <p className="text-[11px] leading-relaxed text-blue-900/70 dark:text-cyan-100/70">
              A custom key is stored as an override in <code className="rounded bg-blue-400/[0.12] px-1">media_config.json</code> and
              takes effect on the media workers&apos; next call — no restart needed. Keys are shown masked and never returned in full.
              <span className="font-medium"> Revert</span> removes the override and falls back to the server&apos;s <code className="rounded bg-blue-400/[0.12] px-1">.env</code> value.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminSystem() {
  return (
    <div className="space-y-5">
      {/* Editable media service keys */}
      <MediaKeysPanel />

      {/* Reference: pipelines & infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard icon={Video} iconColor="bg-blue-500/15 text-blue-400" title="Video Generation (D-ID)">
          <div className="space-y-0.5">
            <ServiceRow label="Provider" value="D-ID API" />
            <ServiceRow label="Fallback provider" value="Tavus" status="fallback" />
            <ServiceRow label="Mode support" value="Learn + Assessment only" />
            <ServiceRow label="Review mode" value="Text only (enforced)" status="inactive" />
            <ServiceRow label="Avatar — Amy" value="Female presenter" />
            <ServiceRow label="Avatar — Josh" value="Male presenter" />
            <ServiceRow label="Subtitle format" value="VTT (converted from SRT)" />
          </div>

          <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            <div className="flex items-start gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-300 mb-1">Fallback Behavior</p>
                <p className="text-xs text-amber-300/60 leading-relaxed">
                  The backend implements <code className="bg-amber-400/10 px-1 rounded">maybe_generate_video()</code> which
                  falls back to text delivery when the D-ID API is unavailable, rate-limited, or when the session
                  is in review mode. The <code className="bg-amber-400/10 px-1 rounded">response_format</code> field
                  in every API response indicates whether video or text was delivered.
                </p>
              </div>
            </div>
          </div>
        </InfoCard>

        <InfoCard icon={Mic} iconColor="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200" title="Audio & TTS Pipeline">
          <div className="space-y-0.5">
            <ServiceRow label="TTS service" value="ElevenLabs (turbo v2.5)" />
            <ServiceRow label="Output format" value="MP3 bytes → Supabase Storage" />
            <ServiceRow label="STT service" value="Whisper (OpenAI)" />
            <ServiceRow label="Voice input" value="WebM → MP3 transcription" />
            <ServiceRow label="Storage bucket" value="Audio URLs via Supabase" />
            <ServiceRow label="Text cleaning" value="Pre-TTS markdown cleanup" />
          </div>
        </InfoCard>

        <InfoCard icon={Cpu} iconColor="bg-emerald-500/15 text-emerald-400" title="AI & RAG Pipeline">
          <div className="space-y-0.5">
            <ServiceRow label="LLM" value="Anthropic Claude (per-mode)" />
            <ServiceRow label="Embeddings" value="OpenAI text-embedding" />
            <ServiceRow label="Vector store" value="Pinecone (mode namespaces)" />
            <ServiceRow label="Learn mode" value="/rag/turn endpoint" />
            <ServiceRow label="Assessment mode" value="/mode-sessions (application)" />
            <ServiceRow label="Review mode" value="/mode-sessions (review)" />
            <ServiceRow label="Review types" value="MCQ, Fill-blank, Short Answer" />
          </div>
        </InfoCard>

        <InfoCard icon={Cloud} iconColor="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200" title="Infrastructure">
          <div className="space-y-0.5">
            <ServiceRow label="Database" value="Supabase (PostgreSQL)" />
            <ServiceRow label="Auth" value="Supabase Auth (JWT)" />
            <ServiceRow label="File storage" value="Supabase Storage" />
            <ServiceRow label="Backend" value="FastAPI (Python 3.12)" />
            <ServiceRow label="Document parsing" value="PDF + DOCX support" />
            <ServiceRow label="Chunk strategies" value="learn / review / application" />
          </div>

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-cyan-300/[0.2] dark:bg-cyan-300/[0.08] px-4 py-3">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-200 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700/70 dark:text-cyan-100/70 leading-relaxed">
                Admin routes use <code className="bg-blue-400/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">admin_guard</code> which checks
                the <code className="bg-blue-400/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">role</code> field in the Supabase{' '}
                <code className="bg-blue-400/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">users</code> table.
                Set <code className="bg-blue-400/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">role = &apos;admin&apos;</code> for admin accounts.
              </p>
            </div>
          </div>
        </InfoCard>
      </div>

      {/* Video fallback architecture */}
      <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-400" />
          Video Fallback Architecture
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              step: '1',
              title: 'TTS Generate',
              desc: 'Text → MP3 via ElevenLabs. Audio uploaded to Supabase Storage.',
              color: 'border-blue-400/20 bg-blue-400/5 text-blue-300',
            },
            {
              step: '2',
              title: 'D-ID Clip',
              desc: 'Audio URL sent to D-ID. Presenter avatar lip-syncs to audio. Returns video_url + SRT.',
              color: 'border-violet-400/20 bg-blue-600/[0.06] dark:bg-cyan-300/[0.08] text-violet-300',
            },
            {
              step: '3',
              title: 'Fallback → Text',
              desc: 'If D-ID fails or mode is review, response_format="text" returned with audio_url only.',
              color: 'border-amber-400/20 bg-amber-400/5 text-amber-300',
            },
          ].map((s) => (
            <div key={s.step} className={cn('rounded-lg border px-4 py-3', s.color)}>
              <div className="text-[10px] font-semibold opacity-60 mb-1.5">STEP {s.step}</div>
              <div className="text-xs font-semibold mb-1">{s.title}</div>
              <div className="text-[11px] opacity-60 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
