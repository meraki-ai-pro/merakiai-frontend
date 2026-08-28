'use client';

/**
 * Videos tab: the review gate.
 *
 * Proposal §10 names notation errors as the risk that would damage the pilot,
 * and lecturer review of every video as the mitigation. Nothing here is
 * visible to a student until Approve is pressed — enforced in the API and in
 * the RLS policy, not just by this screen.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Code2,
  Film,
  Loader2,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import type { RenderAsset } from '@/types/lecturer';

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

  // Renders take minutes, and narration is a second job that starts after the
  // render finishes — so a video can still be in flight while its status
  // already reads 'ready'. Polling on render status alone would stop one step
  // early and leave the audio badge stuck on "adding narration".
  useEffect(() => {
    const inFlight = assets.some(
      (a) =>
        a.status === 'queued' ||
        a.status === 'rendering' ||
        a.narration_status === 'pending' ||
        a.narration_status === 'narrating'
    );
    if (!inFlight) return;
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
            Students cannot see these yet. Watch it through with the sound on — you are approving
            the narration as well as the visuals.
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
      // No subject here on purpose. This used to send a hard-coded
      // "mathematics" on every request, so a Biology or Chemistry course with
      // no archetype chosen was routed to Manim — an engine for continuous
      // mathematics — and produced a confident, useless equation-shaped video.
      // The server now reads the course's own subject (Settings tab).
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
            <Sparkles className="h-4 w-4" /> Generate a concept video
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Describe the concept in your own words. Meraki animates it and reads it aloud, and it
            stays hidden from students until you approve it below.
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
  const [sourceScript, setSourceScript] = useState<string>('');
  const [narration, setNarration] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expanded || preview) return;
    void apiClient.getRenderAsset(asset.id).then((res) => {
      setPreview(res?.data?.preview_url ?? null);
      setSceneCode(res?.data?.asset?.scene_code ?? null);
      setSourceScript(res?.data?.asset?.source_script ?? '');
      setNarration(res?.data?.asset?.narration_script ?? null);
    });
  }, [expanded, asset.id, preview]);

  // The signed preview URL is minted per fetch and the storage path is
  // REPLACED when narration lands, so a cached silent copy would keep playing
  // after the audio arrived. Dropping it forces a re-fetch.
  useEffect(() => {
    setPreview(null);
  }, [asset.has_audio, asset.narration_status]);

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
    <li className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
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
              {asset.revision && asset.revision > 1 ? ` · revision ${asset.revision}` : ''}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <NarrationLabel asset={asset} />
          <StatusLabel asset={asset} />
          {(asset.status === 'ready' || asset.status === 'failed') && (
            <button
              type="button"
              onClick={() => {
                if (!expanded) onToggle();
                setEditing(true);
              }}
              title="Change the prompt and render it again"
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </button>
          )}
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
          {asset.revision_note && (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <span className="font-medium">What changed:</span> {asset.revision_note}
            </p>
          )}
          {preview && (
            <video src={preview} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
          )}

          {/* The spoken track is generated too, so it is part of what is being
              approved. Shown as text because a wrong word is far easier to
              spot on the page than by re-listening. */}
          {narration && (
            <details>
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                <Volume2 className="h-3.5 w-3.5" /> Narration script
              </summary>
              <p className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-white/5 dark:text-slate-300">
                {narration}
              </p>
            </details>
          )}

          {editing && (
            <RegeneratePanel
              asset={asset}
              initialScript={sourceScript}
              onCancel={() => setEditing(false)}
              onQueued={() => {
                setEditing(false);
                onReviewed();
              }}
            />
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

/**
 * Edit the prompt and render it again.
 *
 * Prefilled with the script that produced this video, because "change the
 * prompt" means changing THIS prompt — retyping it from memory is how a
 * lecturer accidentally drops the one constraint that was working.
 */
function RegeneratePanel({
  asset,
  initialScript,
  onCancel,
  onQueued,
}: {
  asset: RenderAsset;
  initialScript: string;
  onCancel: () => void;
  onQueued: () => void;
}) {
  const [script, setScript] = useState(initialScript);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setScript(initialScript);
  }, [initialScript]);

  const unchanged = script.trim() === initialScript.trim();

  const submit = async () => {
    if (!script.trim() || unchanged) return;
    setBusy(true);
    const res = await apiClient.regenerateRenderAsset(asset.id, {
      source_script: script.trim(),
      note: note.trim() || null,
    });
    setBusy(false);

    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'Could not queue the new version');
      return;
    }
    toast.success(
      res.data.status === 'queued'
        ? 'Queued — the current video stays live until you approve the new one'
        : `Already rendered (${res.data.status})`
    );
    onQueued();
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-cyan-300/25 dark:bg-cyan-300/[0.06]">
      <h4 className="text-sm font-medium text-slate-900 dark:text-white">
        Regenerate &ldquo;{asset.concept_key}&rdquo;
      </h4>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        Edit what the animation should show. This creates a new version — students keep seeing the
        current one until you approve the new one.
      </p>

      <label className="mt-3 block text-sm">
        <span className="text-slate-600 dark:text-slate-300">What should it show?</span>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={6}
          data-testid="regenerate-script"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
        />
      </label>

      <label className="mt-3 block text-sm">
        <span className="text-slate-600 dark:text-slate-300">What did you change? (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="The sign in step 3 was wrong"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
        />
      </label>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || unchanged || !script.trim()}
          data-testid="regenerate-submit"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy ? 'Queueing…' : 'Render new version'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        {/* Said up front rather than as an error after they press the button:
            an unchanged prompt returns the cached render and would look like
            nothing happened. */}
        {unchanged && (
          <span className="text-xs text-slate-500">Edit the prompt to enable this.</span>
        )}
      </div>
    </div>
  );
}

/**
 * Whether this video has its spoken track yet.
 *
 * Narration runs as a second job on a different worker, so an asset is briefly
 * `ready` with no audio. Showing that plainly is better than a lecturer
 * approving what looks like a finished video and wondering why it is silent.
 */
function NarrationLabel({ asset }: { asset: RenderAsset }) {
  if (asset.status !== 'ready') return null;

  if (asset.narration_status === 'narrating' || asset.narration_status === 'pending') {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-cyan-300">
        <Loader2 className="h-3 w-3 animate-spin" /> Adding narration…
      </span>
    );
  }
  if (asset.narration_status === 'failed') {
    return (
      <span
        className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
        title="The video is fine and can be approved; only the spoken track failed."
      >
        <VolumeX className="h-3 w-3" /> No audio
      </span>
    );
  }
  if (asset.has_audio) {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400" title="Narrated">
        <Volume2 className="h-3 w-3" /> Narrated
      </span>
    );
  }
  return null;
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
