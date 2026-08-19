'use client';

/**
 * Instructor videos tab: the review gate.
 *
 * Proposal §10 names notation errors as the risk that would damage the pilot,
 * and lecturer review of every video as the mitigation. Nothing here is
 * visible to a student until Approve is pressed — enforced in the API and in
 * the RLS policy, not just by this screen.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Code2, Film, Loader2, Sparkles, X } from 'lucide-react';
import { apiClient } from '@/services/api';
import type { RenderAsset } from '@/types/instructor';

export function VideosTab({ courseId }: { courseId: string }) {
  const [assets, setAssets] = useState<RenderAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiClient.listRenderAssets(courseId);
    setAssets(res?.data?.assets ?? []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Renders take minutes. Poll while anything is in flight.
  useEffect(() => {
    if (!assets.some((a) => a.status === 'queued' || a.status === 'rendering')) return;
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [assets, load]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  const awaiting = assets.filter((a) => a.status === 'ready' && !a.approved_at);
  const rest = assets.filter((a) => !(a.status === 'ready' && !a.approved_at));

  return (
    <div className="space-y-6">
      <RequestVideoPanel courseId={courseId} onQueued={load} />

      {awaiting.length > 0 && (
        <section>
          <h2 className="mb-1 font-medium text-slate-900 dark:text-white">
            Awaiting your review ({awaiting.length})
          </h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Students cannot see these yet. Check the mathematics before approving.
          </p>
          <ul className="space-y-3">
            {awaiting.map((a) => (
              <AssetRow
                key={a.id}
                asset={a}
                expanded={open === a.id}
                onToggle={() => setOpen(open === a.id ? null : a.id)}
                onReviewed={load}
              />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-medium text-slate-900 dark:text-white">All videos</h2>
        {rest.length === 0 && awaiting.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
            No videos yet. Concept animations are generated from your teaching material and appear
            here for review.
          </p>
        ) : (
          <ul className="space-y-3">
            {rest.map((a) => (
              <AssetRow
                key={a.id}
                asset={a}
                expanded={open === a.id}
                onToggle={() => setOpen(open === a.id ? null : a.id)}
                onReviewed={load}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Request a concept animation.
 *
 * The archetype list is fetched rather than hard-coded: GET /render/archetypes
 * is what decides which renderer a request routes to, and it also reports the
 * archetypes neither renderer supports. Offering an unsupported one here would
 * only produce a 400 after the lecturer has written a script.
 */
function RequestVideoPanel({
  courseId,
  onQueued,
}: {
  courseId: string;
  onQueued: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [conceptKey, setConceptKey] = useState('');
  const [topic, setTopic] = useState('');
  const [archetype, setArchetype] = useState('');
  const [script, setScript] = useState('');
  const [archetypes, setArchetypes] = useState<{ name: string; renderer: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || archetypes.length) return;
    void apiClient.listRenderArchetypes().then((r) => setArchetypes(r?.data?.archetypes ?? []));
  }, [open, archetypes.length]);

  const submit = async () => {
    if (!conceptKey.trim() || !script.trim()) return;
    setBusy(true);
    const res = await apiClient.requestRender({
      course_id: courseId,
      concept_key: conceptKey.trim(),
      source_script: script.trim(),
      archetype: archetype || null,
      topic: topic.trim() || null,
      subject: 'mathematics',
    });
    setBusy(false);

    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'Could not queue the video');
      return;
    }
    // A repeat request for an unchanged script is a cache hit, not a new job —
    // say so, otherwise "nothing happened" looks like a failure.
    toast.success(
      res.data.status === 'queued'
        ? 'Queued — rendering takes a few minutes'
        : `Already rendered (${res.data.status})`,
    );
    setConceptKey('');
    setScript('');
    setTopic('');
    setOpen(false);
    onQueued();
  };

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/[0.68] p-6 shadow-lg shadow-blue-950/[0.05] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
            <Sparkles className="h-4 w-4" /> Generate a concept video
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Describe the concept in your own words. Meraki animates it, and it stays hidden from
            students until you approve it below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {open ? 'Cancel' : 'New video'}
        </button>
      </div>

      {open && (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Concept name</span>
              <input
                value={conceptKey}
                onChange={(e) => setConceptKey(e.target.value)}
                placeholder="chain-rule"
                data-testid="render-concept-key"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Identifies the animation so a student asking about this concept gets it.
              </span>
            </label>

            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Topic (optional)</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Differentiation"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="text-slate-600 dark:text-slate-300">Visual style</span>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              data-testid="render-archetype"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
            >
              <option value="">Choose automatically</option>
              {archetypes.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name.replace(/_/g, ' ')} ({a.renderer})
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="text-slate-600 dark:text-slate-300">What should it show?</span>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={5}
              data-testid="render-script"
              placeholder="Show how the chain rule differentiates y = (3x^2 + 1)^5: name the outer and inner function, differentiate each, then multiply and substitute back."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
            />
          </label>

          <div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !conceptKey.trim() || !script.trim()}
              data-testid="render-submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? 'Queueing…' : 'Generate video'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AssetRow({
  asset,
  expanded,
  onToggle,
  onReviewed,
}: {
  asset: RenderAsset;
  expanded: boolean;
  onToggle: () => void;
  onReviewed: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [sceneCode, setSceneCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expanded || preview) return;
    void apiClient.getRenderAsset(asset.id).then((res) => {
      setPreview(res?.data?.preview_url ?? null);
      setSceneCode(res?.data?.asset?.scene_code ?? null);
    });
  }, [expanded, asset.id, preview]);

  const review = async (approved: boolean) => {
    if (!approved) {
      const note = window.prompt('Why is this being rejected? (optional)') ?? undefined;
      setBusy(true);
      const res = await apiClient.reviewRenderAsset(asset.id, false, note);
      setBusy(false);
      if (!res.success) return toast.error('Could not reject');
      toast.success('Rejected — hidden from students');
      return onReviewed();
    }
    setBusy(true);
    const res = await apiClient.reviewRenderAsset(asset.id, true);
    setBusy(false);
    if (!res.success) return toast.error('Could not approve');
    toast.success('Approved — students can now see it');
    onReviewed();
  };

  return (
    <li className="overflow-hidden rounded-2xl border border-white/70 bg-white/[0.68] shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button type="button" onClick={onToggle} className="flex min-w-0 items-center gap-3 text-left">
          <Film className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 dark:text-white">
              {asset.concept_key}
            </p>
            <p className="text-xs text-slate-500">
              {asset.renderer}
              {asset.archetype ? ` · ${asset.archetype}` : ''}
              {asset.duration_seconds ? ` · ${Math.round(asset.duration_seconds)}s` : ''}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <StatusLabel asset={asset} />
          {asset.status === 'ready' && (
            <>
              <button
                type="button"
                onClick={() => void review(true)}
                disabled={busy || !!asset.approved_at}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-30"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={() => void review(false)}
                disabled={busy}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-white/10">
          {asset.error && (
            <pre className="overflow-x-auto rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {asset.error}
            </pre>
          )}
          {preview && (
            <video src={preview} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
          )}
          {/* The generated source is shown on purpose: a wrong sign is far
              easier to find in the scene than by re-watching the animation. */}
          {sceneCode && (
            <details>
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                <Code2 className="h-3.5 w-3.5" /> Generated scene
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                {sceneCode}
              </pre>
            </details>
          )}
        </div>
      )}
    </li>
  );
}

function StatusLabel({ asset }: { asset: RenderAsset }) {
  if (asset.status === 'queued') return <span className="text-xs text-slate-400">Queued</span>;
  if (asset.status === 'rendering')
    return <span className="text-xs text-blue-600 dark:text-cyan-300">Rendering…</span>;
  if (asset.status === 'failed')
    return <span className="text-xs text-red-600 dark:text-red-400">Failed</span>;
  if (asset.approved_at)
    return <span className="text-xs text-emerald-600 dark:text-emerald-400">Live</span>;
  if (asset.rejected_at) return <span className="text-xs text-slate-400">Rejected</span>;
  return <span className="text-xs text-amber-600 dark:text-amber-400">Needs review</span>;
}
