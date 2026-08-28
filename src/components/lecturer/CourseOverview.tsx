'use client';

/**
 * Course overview: engagement, mastery and learning gain.
 *
 * The backend has carried mastery states, an events stream and pre/post
 * assessments for a while; the overview showed four counters and a paragraph
 * saying the rest "is not built yet". This is that instrumentation surfaced.
 *
 * Two rules run through the whole screen, and they are the reason it is not
 * simply a wall of numbers:
 *
 *   1. **An unmeasured metric is never rendered as zero.** "0 topics secure"
 *      and "no graded attempts yet" look identical on a dashboard and mean
 *      opposite things — one is a cohort in trouble, the other is a cohort
 *      that has not started. Every block below reads `measured` and says which
 *      it is.
 *
 *   2. **Mastery is shown as bands and named topics, never as one percentage.**
 *      The underlying signal is an exponential moving average over a handful of
 *      graded attempts per topic; a single cohort figure derived from it would
 *      be precise-looking and unactionable. What a lecturer can act on is
 *      "these four topics are weak" and "these six students are struggling".
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  GraduationCap,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { MODE_LABELS } from '@/lib/constants';
import type {
  CourseAnalytics,
  CourseMastery,
  MasteryBand,
} from '@/types/lecturer';

const BAND_STYLES: Record<MasteryBand, { label: string; dot: string; text: string }> = {
  secure: {
    label: 'Secure',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  developing: {
    label: 'Developing',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  struggling: {
    label: 'Struggling',
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
  },
};

interface LearningGain {
  available?: boolean;
  reason?: string;
  n?: number;
  mean_pre?: number;
  mean_post?: number;
  mean_gain?: number;
  improved?: number;
  unchanged?: number;
  declined?: number;
}

export function CourseOverview({ courseId }: { courseId: string }) {
  const [data, setData] = useState<CourseAnalytics | null>(null);
  const [mastery, setMastery] = useState<CourseMastery | null>(null);
  const [gain, setGain] = useState<LearningGain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Three independent calls. The rollup is the one that must land; mastery
    // and learning gain each render their own "not measured yet" panel, so a
    // course with no graded attempts still gets a complete page.
    void Promise.all([
      apiClient.getCourseAnalytics(courseId),
      apiClient.getCourseMastery(courseId),
      apiClient.getLearningGain(courseId),
    ]).then(([a, m, g]) => {
      if (cancelled) return;
      setData(a?.data ?? null);
      setMastery(m?.data ?? null);
      setGain((g?.data as LearningGain) ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Analytics are unavailable right now.</p>;
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active students" value={data.students.active} />
        <Stat label="Completed" value={data.students.completed} />
        <Stat label="Published files" value={data.knowledge.published} />
        <Stat
          label="Videos awaiting review"
          value={data.videos.awaiting_review}
          highlight={data.videos.awaiting_review > 0}
        />
      </section>

      {/* The number an enrolment count hides, and the first thing worth acting
          on in a pilot. */}
      {data.students.enrolled_but_never_started > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {data.students.enrolled_but_never_started} enrolled student
            {data.students.enrolled_but_never_started === 1 ? ' has' : 's have'} never opened a
            session.
          </span>
        </p>
      )}

      <Panel icon={BarChart3} title="Sessions by mode">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={`${MODE_LABELS.learn} sessions`} value={data.sessions.by_mode.learn} />
          <Stat label={`${MODE_LABELS.review} sessions`} value={data.sessions.by_mode.review} />
          <Stat
            label={`${MODE_LABELS.application} sessions`}
            value={data.sessions.by_mode.application}
          />
        </div>
      </Panel>

      <TimeOnTaskPanel data={data} />
      <EngagementPanel data={data} />
      <MasteryPanel summary={data} mastery={mastery} />
      <LearningGainPanel gain={gain} />

      {data.unavailable?.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-4 text-sm dark:border-white/10">
          <p className="font-medium text-slate-900 dark:text-white">Not yet measured</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {data.unavailable.map((m) => m.replace(/_/g, ' ')).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

function TimeOnTaskPanel({ data }: { data: CourseAnalytics }) {
  const t = data.time_on_task;
  return (
    <Panel icon={Clock} title="Time on task">
      {!t?.measured ? (
        <NotMeasured reason={t?.reason ?? 'No completed sessions yet.'} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total minutes studied" value={t.total_minutes ?? 0} />
            <Stat label="Median session (min)" value={t.median_minutes ?? 0} />
            <Stat label="Mean session (min)" value={t.mean_minutes ?? 0} />
          </div>
          {/* Both numbers are shown because the distribution is badly skewed,
              and only one of them describes a typical student. */}
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            From {t.completed_sessions} closed session
            {t.completed_sessions === 1 ? '' : 's'}. Sessions still open are not counted — a tab
            left open overnight would otherwise be the most engaged student in the cohort. The
            median is the typical session; the mean is pulled up by a few long ones.
          </p>
        </>
      )}
    </Panel>
  );
}

function EngagementPanel({ data }: { data: CourseAnalytics }) {
  const e = data.engagement;
  return (
    <Panel icon={Users} title="Engagement">
      {!e?.measured ? (
        <NotMeasured reason={e?.reason ?? 'No events recorded yet.'} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Questions answered" value={e.turns ?? 0} />
            <Stat label="Sources opened" value={e.sources_opened ?? 0} />
            <Stat label="Citations clicked" value={e.citations_clicked ?? 0} />
            <Stat label="Videos watched through" value={e.videos_completed ?? 0} />
          </div>
          {/* Given its own callout rather than a fifth tile: it is the only
              number here that names an action for the lecturer. */}
          {(e.empty_retrievals ?? 0) > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              {e.empty_retrievals} question{e.empty_retrievals === 1 ? '' : 's'} found nothing in
              your material. That is the clearest signal of what to upload next.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

function MasteryPanel({
  summary,
  mastery,
}: {
  summary: CourseAnalytics;
  mastery: CourseMastery | null;
}) {
  const [showStudents, setShowStudents] = useState(false);
  const bands = summary.mastery?.bands;

  return (
    <Panel icon={GraduationCap} title="Mastery">
      {!summary.mastery?.measured ? (
        <NotMeasured
          reason={
            summary.mastery?.reason ??
            'No graded attempts yet. Mastery appears once students answer Review or Assessment questions.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {summary.mastery.students_tracked} student
            {summary.mastery.students_tracked === 1 ? '' : 's'} across{' '}
            {summary.mastery.topics_tracked} topic
            {summary.mastery.topics_tracked === 1 ? '' : 's'}.
          </p>

          {bands && <BandBar bands={bands} />}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TopicList
              title="Needs reteaching"
              empty="No weak topics."
              topics={summary.mastery.weakest_topics ?? []}
            />
            <TopicList
              title="Secure"
              empty="Nothing secure yet."
              topics={summary.mastery.strongest_topics ?? []}
            />
          </div>

          {/* The per-student table is behind a toggle rather than always open:
              it is the view for planning a tutorial, not for a glance, and on a
              200-student cohort it would bury everything above it. */}
          {mastery?.measured && mastery.students.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowStudents((v) => !v)}
                className="text-sm font-medium text-blue-600 hover:underline dark:text-cyan-300"
              >
                {showStudents ? 'Hide' : 'Show'} the {mastery.students.length} student
                {mastery.students.length === 1 ? '' : 's'} being tracked
              </button>

              {showStudents && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-white/10">
                        <th className="py-2 pr-4">Student</th>
                        <th className="py-2 pr-4">Standing</th>
                        <th className="py-2 pr-4">Topics</th>
                        <th className="py-2">Struggling with</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mastery.students.map((s) => (
                        <tr
                          key={s.student_id}
                          className="border-b border-slate-100 dark:border-white/5"
                        >
                          <td className="py-2 pr-4">
                            <span className="text-slate-900 dark:text-white">
                              {s.name ?? s.email ?? 'Unknown'}
                            </span>
                            {s.name && s.email && (
                              <span className="ml-2 text-xs text-slate-400">{s.email}</span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`inline-flex items-center gap-1.5 ${BAND_STYLES[s.band].text}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${BAND_STYLES[s.band].dot}`}
                              />
                              {BAND_STYLES[s.band].label}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-slate-500">{s.topics_tracked}</td>
                          <td className="py-2 text-slate-500">
                            {s.struggling_topics.length > 0
                              ? s.struggling_topics.join(', ')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-slate-400">
                    Weakest first. Standing is an exponential moving average of correctness, so a
                    student who has just understood a topic moves up quickly rather than being
                    held down by their first few attempts.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function LearningGainPanel({ gain }: { gain: LearningGain | null }) {
  return (
    <Panel icon={TrendingUp} title="Learning gain (pre vs post)">
      {!gain?.available ? (
        <NotMeasured
          reason={gain?.reason ?? 'Set up a pre-test and a post-test to measure this.'}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Mean pre-test %" value={gain.mean_pre ?? 0} />
            <Stat label="Mean post-test %" value={gain.mean_post ?? 0} />
            <Stat
              label="Mean gain (points)"
              value={gain.mean_gain ?? 0}
              highlight={(gain.mean_gain ?? 0) > 0}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Over the {gain.n} student{gain.n === 1 ? '' : 's'} who sat both. {gain.improved}{' '}
            improved, {gain.unchanged} unchanged, {gain.declined} declined. Students who sat only
            one are excluded — comparing everyone&rsquo;s pre-test against whoever came back for
            the post-test manufactures a gain out of attrition.
          </p>
        </>
      )}
    </Panel>
  );
}

function BandBar({ bands }: { bands: Record<MasteryBand, number> }) {
  const order: MasteryBand[] = ['secure', 'developing', 'struggling'];
  const total = order.reduce((sum, b) => sum + (bands[b] ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        {order.map((band) =>
          (bands[band] ?? 0) > 0 ? (
            <div
              key={band}
              className={BAND_STYLES[band].dot}
              style={{ width: `${((bands[band] ?? 0) / total) * 100}%` }}
              title={`${bands[band]} ${BAND_STYLES[band].label.toLowerCase()}`}
            />
          ) : null
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs">
        {order.map((band) => (
          <span key={band} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className={`h-1.5 w-1.5 rounded-full ${BAND_STYLES[band].dot}`} />
            {BAND_STYLES[band].label}: {bands[band] ?? 0}
          </span>
        ))}
      </div>
      {/* Counts, not a cohort mean. Averaging across topics with wildly
          different attempt counts produces a number nobody should act on. */}
      <p className="mt-2 text-xs text-slate-400">
        Counted per student per topic, not averaged into one score.
      </p>
    </div>
  );
}

function TopicList({
  title,
  topics,
  empty,
}: {
  title: string;
  topics: { topic: string; mean: number; students: number }[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </p>
      {topics.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {topics.map((t) => (
            <li key={t.topic} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{t.topic}</span>
              <span className="flex-shrink-0 text-xs text-slate-400">
                {Math.round(t.mean * 100)}% · {t.students} student{t.students === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-900 dark:text-white">
        <Icon className="h-4 w-4 text-slate-400" /> {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * "Not measured" is a different statement from "zero", and this is the only
 * component that renders it. A lecturer reading 0 where the truth is "nobody
 * has answered anything yet" draws the opposite conclusion.
 */
function NotMeasured({ reason }: { reason: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
      Not measured yet — {reason}
    </p>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10'
          : 'rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5'
      }
    >
      <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
