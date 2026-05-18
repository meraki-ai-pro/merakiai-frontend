'use client';

import {
  Video,
  Mic,
  Cpu,
  Cloud,
  CheckCircle2,
  Info,
  Zap,
  Globe,
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

export function AdminSystem() {
  return (
    <div className="space-y-5">
      {/* Video pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard icon={Video} iconColor="bg-blue-500/15 text-blue-400" title="Video Generation (D-ID)">
          <div className="space-y-0.5">
            <ServiceRow label="Provider" value="D-ID API" />
            <ServiceRow label="Mode support" value="Learn + Practice only" />
            <ServiceRow label="Review mode" value="Text only (enforced)" status="inactive" />
            <ServiceRow label="Avatar — Amy" value="Female presenter" />
            <ServiceRow label="Avatar — Josh" value="Male presenter" />
            <ServiceRow label="Voice bundling" value="Auto-matched to avatar gender" />
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
            <ServiceRow label="TTS service" value="ElevenLabs / OpenAI TTS" />
            <ServiceRow label="Output format" value="MP3 bytes → Supabase Storage" />
            <ServiceRow label="STT service" value="Whisper (OpenAI)" />
            <ServiceRow label="Voice input" value="WebM → MP3 transcription" />
            <ServiceRow label="Storage bucket" value="Audio URLs via Supabase" />
            <ServiceRow label="Text cleaning" value="Pre-TTS markdown cleanup" />
          </div>
        </InfoCard>

        <InfoCard icon={Cpu} iconColor="bg-emerald-500/15 text-emerald-400" title="AI & RAG Pipeline">
          <div className="space-y-0.5">
            <ServiceRow label="LLM" value="Anthropic Claude (Opus)" />
            <ServiceRow label="Embeddings" value="OpenAI text-embedding" />
            <ServiceRow label="Vector store" value="Pinecone (mode namespaces)" />
            <ServiceRow label="Learn mode" value="/rag/turn endpoint" />
            <ServiceRow label="Practice mode" value="/mode-sessions (practice)" />
            <ServiceRow label="Review mode" value="/mode-sessions (review)" />
            <ServiceRow label="Review types" value="MCQ, Fill-blank, Flashcard, Short Answer" />
          </div>
        </InfoCard>

        <InfoCard icon={Cloud} iconColor="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200" title="Infrastructure">
          <div className="space-y-0.5">
            <ServiceRow label="Database" value="Supabase (PostgreSQL)" />
            <ServiceRow label="Auth" value="Supabase Auth (JWT)" />
            <ServiceRow label="File storage" value="Supabase Storage" />
            <ServiceRow label="Backend" value="FastAPI (Python 3.12)" />
            <ServiceRow label="Document parsing" value="PDF + DOCX support" />
            <ServiceRow label="Chunk strategies" value="learn / review / practice" />
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
