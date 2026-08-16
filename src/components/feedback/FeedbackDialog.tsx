'use client';

/**
 * Student feedback capture.
 *
 * Two things the pilot needs and the app could not previously collect:
 *
 *   - a per-session survey (clarity / helpfulness / confidence / overall),
 *     which is the research instrument the study reports on, and
 *   - free-text feedback, which is where "the derivative in step 3 is wrong"
 *     actually arrives.
 *
 * They share a dialog because a student has one mental action ("tell them
 * something"), but they post to different endpoints and the survey requires a
 * session while free text does not.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Loader2, MessageSquarePlus, Star, X } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';
import type { UserFeedbackRequest } from '@/types';

const RATINGS: { key: RatingKey; label: string; help: string }[] = [
  { key: 'clarity_rating', label: 'Clarity', help: 'Were the explanations easy to follow?' },
  { key: 'helpfulness_rating', label: 'Helpfulness', help: 'Did it help you make progress?' },
  { key: 'confidence_rating', label: 'Confidence', help: 'Do you feel more confident now?' },
  { key: 'overall_rating', label: 'Overall', help: 'Your overall rating of this session.' },
];

type RatingKey =
  | 'clarity_rating'
  | 'helpfulness_rating'
  | 'confidence_rating'
  | 'overall_rating';

const FEEDBACK_TYPES: { value: UserFeedbackRequest['feedback_type']; label: string }[] = [
  { value: 'content', label: 'Course content' },
  { value: 'bug', label: 'Something broke' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'ux', label: 'Hard to use' },
  { value: 'other', label: 'Other' },
];

export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    clarity_rating: 0,
    helpfulness_rating: 0,
    confidence_rating: 0,
    overall_rating: 0,
  });
  const [type, setType] = useState<UserFeedbackRequest['feedback_type']>('content');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const allRated = RATINGS.every((r) => ratings[r.key] > 0);

  const submit = async () => {
    if (!allRated && !message.trim()) {
      toast.error('Rate the session or write a comment before sending.');
      return;
    }
    setBusy(true);
    let sentSomething = false;
    let failed = false;

    // The survey needs a session; free text does not. Send whichever the
    // student actually filled in rather than forcing both.
    if (allRated && currentSessionId) {
      const res = await apiClient.submitSessionSurvey({
        session_id: currentSessionId,
        ...ratings,
      });
      if (res.success) sentSomething = true;
      else failed = true;
    }

    if (message.trim()) {
      const res = await apiClient.submitUserFeedback({
        session_id: currentSessionId ?? null,
        feedback_type: type,
        message: message.trim(),
      });
      if (res.success) sentSomething = true;
      else failed = true;
    }

    setBusy(false);

    if (failed && !sentSomething) {
      toast.error('Could not send your feedback. Please try again.');
      return;
    }
    if (allRated && !currentSessionId) {
      toast('Ratings need an open session — your comment was sent.');
    } else {
      toast.success('Thank you — your feedback was recorded.');
    }
    setRatings({
      clarity_rating: 0,
      helpfulness_rating: 0,
      confidence_rating: 0,
      overall_rating: 0,
    });
    setMessage('');
    onClose();
  };

  // Portalled to <body> deliberately. The trigger lives in the header, which
  // has backdrop-blur — and a filter/backdrop-filter ancestor becomes the
  // containing block for position:fixed descendants, so rendering in place
  // pinned this overlay to the 64px header instead of the viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Send feedback"
    >
      <div
        data-testid="feedback-dialog"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/70 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              How was this session?
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Your answers go to your lecturer and the research team. They are not shown to other
              students.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Laid out as label-beside-stars rather than stacked: four stacked
            rating rows made the dialog taller than a 720px laptop viewport,
            pushing the last row off screen. */}
        <div className="mt-4 space-y-2">
          {RATINGS.map((r) => (
            <div
              key={r.key}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
              title={r.help}
            >
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {r.label}
              </span>
              <div className="flex gap-1" role="radiogroup" aria-label={r.label}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={ratings[r.key] === n}
                    aria-label={`${r.label} ${n} of 5`}
                    data-testid={`rate-${r.key}-${n}`}
                    onClick={() => setRatings((prev) => ({ ...prev, [r.key]: n }))}
                    className="rounded-md p-1 transition hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'h-5 w-5',
                        n <= ratings[r.key]
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600',
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!currentSessionId && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Ratings attach to a study session. Open a session first if you want to rate one — you
            can still send a comment now.
          </p>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
          <label className="text-sm font-medium text-slate-900 dark:text-white">
            Anything else?
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {FEEDBACK_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  type === t.value
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-testid="feedback-message"
            rows={3}
            maxLength={5000}
            placeholder="For example: the worked example on the chain rule skipped a step."
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-950"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            data-testid="feedback-submit"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send feedback
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Header trigger for the dialog above. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-feedback"
        title="Send feedback"
        aria-label="Send feedback"
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </button>
      <FeedbackDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
