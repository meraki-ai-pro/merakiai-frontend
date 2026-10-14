'use client';

/**
 * Course overview: activity, exams, engagement and mastery, with charts.
 *
 * The pre/post learning-gain panel was removed at the client's request; the
 * endpoint and its rows remain.
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
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { ActivityChart, CategoryBars, TopicMasteryChart } from './AnalyticsCharts';
import { InterventionStudio } from './InterventionStudio';
import {
  MisconceptionRadarPanel,
  StudentTimelineDialog,
  TutorActivityPanel,
} from './TutorInsights';
import { MODE_LABELS } from '@/lib/constants';
import type {
  AttentionKind,
  AttentionStudent,
  CourseAnalytics,
  CourseMastery,
  ExamSummary,
  InterventionFocus,
  MasteryBand,
  StudentRef,
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

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]';

export function CourseOverview({ courseId, onOpenExams }: { courseId: string; onOpenExams?: () => void }) {
  const [data, setData] = useState<CourseAnalytics | null>(null);
  const [mastery, setMastery] = useState<CourseMastery | null>(null);
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [attention, setAttention] = useState<AttentionStudent[] | null>(null);
  const [timelineFor, setTimelineFor] = useState<StudentRef | null>(null);
  const [studioFocus, setStudioFocus] = useState<InterventionFocus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Independent calls. The rollup is the one that must land; the others each
    // render their own "not measured yet" panel, so a course with no graded
    // attempts still gets a complete page.
    void Promise.all([
      apiClient.getCourseAnalytics(courseId),
      apiClient.getCourseMastery(courseId),
      apiClient.getExamsSummary(courseId),
      apiClient.getCourseAttention(courseId),
    ]).then(([a, m, ex, att]) => {
      if (cancelled) return;
      setData(a?.data ?? null);
      setMastery(m?.data ?? null);
      setExams(ex?.data?.exams ?? null);
      setAttention(att?.data?.students ?? null);
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
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Active students" value={data.students.active} />
        <Kpi icon={UserCheck} label="Completed" value={data.students.completed} />
        <Kpi icon={FileText} label="Published files" value={data.knowledge.published} />
        <Kpi
          icon={Video}
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

      {data.activity && (
        <Panel icon={Activity} title="Activity — last 30 days">
          <ActivityChart data={data.activity} />
        </Panel>
      )}

      <ExamsPanel courseId={courseId} exams={exams} onOpenExams={onOpenExams} />

      {attention !== null && (
        <AttentionPanel students={attention} onOpenStudent={setTimelineFor} onAct={setStudioFocus} />
      )}

      <div className={`${CARD} empty:hidden`}>
        <MisconceptionRadarPanel courseId={courseId} onOpenStudent={setTimelineFor} onAct={setStudioFocus} />
      </div>

      <div className={`${CARD} empty:hidden`}>
        <TutorActivityPanel courseId={courseId} onOpenStudent={setTimelineFor} />
      </div>

      <StudentTimelineDialog courseId={courseId} student={timelineFor} onClose={() => setTimelineFor(null)} />

      <InterventionStudio
        courseId={courseId}
        focus={studioFocus}
        onClose={() => setStudioFocus(null)}
        onOpenExams={onOpenExams}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel icon={BarChart3} title="Sessions by mode">
          <CategoryBars
            ariaLabel="Sessions by mode"
            valueLabel="Sessions"
            data={[
              { name: MODE_LABELS.learn, value: data.sessions.by_mode.learn },
              { name: MODE_LABELS.review, value: data.sessions.by_mode.review },
              { name: MODE_LABELS.application, value: data.sessions.by_mode.application },
            ]}
          />
        </Panel>
        <TimeOnTaskPanel data={data} />
      </div>
      <EngagementPanel data={data} />
      <MasteryPanel summary={data} mastery={mastery} setTimelineFor={setTimelineFor} onAct={setStudioFocus} />

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
      <p className="-mt-1 mb-3 text-sm text-slate-500 dark:text-slate-400">
        How long students actually spend studying with the tutor, measured from their activity:
        the time between one question and the next. Students never need to close a session.
      </p>
      {!t?.measured ? (
        <NotMeasured reason={t?.reason ?? 'No session has more than one question yet.'} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Total minutes studied" value={t.total_minutes ?? 0} />
            <Stat label="Typical session (median, min)" value={t.median_minutes ?? 0} />
            <Stat label="Average session (mean, min)" value={t.mean_minutes ?? 0} />
          </div>
          {t.histogram && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Session length (minutes)</p>
              <CategoryBars
                ariaLabel="Sessions by minutes of study"
                valueLabel="Sessions"
                data={t.histogram.map((h) => ({ name: h.bucket, value: h.sessions }))}
              />
            </div>
          )}
          {/* Both numbers are shown because the distribution is badly skewed,
              and only one of them describes a typical student. */}
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            From {t.sessions} session{t.sessions === 1 ? '' : 's'} by enrolled students. A pause
            longer than {t.break_minutes ?? 15} minutes counts as {t.break_minutes ?? 15}, so a tab
            left open overnight adds nothing.
            {(t.single_message_sessions ?? 0) > 0 &&
              ` ${t.single_message_sessions} single-question session${t.single_message_sessions === 1 ? ' is' : 's are'} not timed — there is no second message to measure to.`}{' '}
            The median is the typical session; the mean is pulled up by a few long ones.
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
  setTimelineFor,
  onAct,
}: {
  summary: CourseAnalytics;
  mastery: CourseMastery | null;
  setTimelineFor: (s: StudentRef) => void;
  onAct: (focus: InterventionFocus) => void;
}) {
  // The students struggling on a topic, as the default audience for acting on it.
  const strugglingOn = (topic: string): StudentRef[] =>
    (mastery?.students ?? [])
      .filter((s) => s.struggling_topics.includes(topic))
      .map((s) => ({ student_id: s.student_id, name: s.name ?? null, email: s.email ?? null }));
  const [showStudents, setShowStudents] = useState(false);
  const bands = summary.mastery?.bands;

  return (
    <Panel icon={GraduationCap} title="Mastery">
      {!summary.mastery?.measured ? (
        <NotMeasured
          reason={
            summary.mastery?.reason ??
            'No graded attempts yet. Mastery appears once students answer Review questions or scenarios.'
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

          {(summary.mastery.topics?.length ?? 0) > 0 && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Average mastery by topic
              </p>
              <TopicMasteryChart topics={summary.mastery.topics ?? []} />
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TopicList
              title="Needs reteaching"
              empty="No weak topics."
              topics={summary.mastery.weakest_topics ?? []}
              onAct={(topic) => onAct({ topic, students: strugglingOn(topic) })}
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
                            <button
                              type="button"
                              onClick={() => setTimelineFor({ student_id: s.student_id, name: s.name ?? null, email: s.email ?? null })}
                              className="text-slate-900 underline-offset-2 hover:underline dark:text-white"
                              title="Open timeline"
                            >
                              {s.name ?? s.email ?? 'Unknown'}
                            </button>
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
  onAct,
}: {
  title: string;
  topics: { topic: string; mean: number; students: number }[];
  empty: string;
  onAct?: (topic: string) => void;
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
              <span className="flex flex-shrink-0 items-center gap-2 text-xs text-slate-400">
                {Math.round(t.mean * 100)}% · {t.students} student{t.students === 1 ? '' : 's'}
                {onAct && (
                  <button type="button" onClick={() => onAct(t.topic)} className="font-medium text-blue-700 hover:underline dark:text-cyan-300">
                    Act
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ATTENTION_LABELS: Record<AttentionKind, { label: string; tone: string }> = {
  declining: { label: 'Declining', tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  dependency: { label: 'Relies on solutions', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  disengaged: { label: 'Gone quiet', tone: 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300' },
  stuck: { label: 'Stuck', tone: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
};

/**
 * Not a ranking by lowest grade: each row is a situation worth a lecturer's
 * time, with the sentence that explains it (rules: app/core/attention.py).
 */
function AttentionPanel({
  students,
  onOpenStudent,
  onAct,
}: {
  students: AttentionStudent[];
  onOpenStudent: (s: StudentRef) => void;
  onAct: (focus: InterventionFocus) => void;
}) {
  return (
    <Panel icon={BellRing} title="Students needing your attention">
      {students.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-white/15">
          Nobody right now. Students are listed here when their mastery is falling, they lean on
          worked solutions, they have gone quiet, or they are stuck on a topic.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5" data-testid="attention-list">
          {students.map((s) => (
            <li key={s.student_id} className="p-4">
              <button
                type="button"
                onClick={() => onOpenStudent(s)}
                className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
                title="Open timeline"
              >
                {s.name ?? s.email ?? 'Unnamed student'}
              </button>
              <ul className="mt-2 space-y-1.5">
                {s.flags.map((f, i) => (
                  <li key={i} className="flex flex-wrap items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ATTENTION_LABELS[f.kind]?.tone ?? ''}`}>
                      {ATTENTION_LABELS[f.kind]?.label ?? f.kind}
                    </span>
                    <span className="min-w-0 flex-1">{f.reason}</span>
                    {f.topic && (
                      <button
                        type="button"
                        onClick={() => onAct({ topic: f.topic as string, students: [s] })}
                        className="text-xs font-medium text-blue-700 hover:underline dark:text-cyan-300"
                      >
                        Act
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-200">
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const KIND_LABELS: Record<string, string> = { quiz: 'Quiz', test: 'Test', midsem: 'Mid-semester', final: 'Final' };
const pct = (v?: number) => (v === undefined ? '—' : `${v}%`);

/** Every exam's cohort results, a mean-score chart, and the Excel download. */
function ExamsPanel({
  courseId,
  exams,
  onOpenExams,
}: {
  courseId: string;
  exams: ExamSummary[] | null;
  onOpenExams?: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const sat = (exams ?? []).filter((e) => e.responses > 0);
  const [selected, setSelected] = useState<string | null>(null);
  const focus = sat.find((e) => e.id === selected) ?? sat[sat.length - 1];

  const download = async () => {
    setDownloading(true);
    const ok = await apiClient.downloadExamResults(courseId);
    setDownloading(false);
    if (!ok) toast.error('Could not download the results');
  };

  return (
    <Panel
      icon={ClipboardCheck}
      title="Exams"
      action={
        (exams?.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            data-testid="download-exam-results"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download Excel
          </button>
        )
      }
    >
      {!exams || exams.length === 0 ? (
        <NotMeasured reason="no exams have been set on this course yet." />
      ) : (
        <>
          {sat.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Average score per exam</p>
                <CategoryBars
                  ariaLabel="Average score per exam"
                  valueLabel="Average score"
                  unit="%"
                  max={100}
                  horizontal
                  data={sat.map((e) => ({ name: e.title, value: e.mean_percent ?? 0 }))}
                />
              </div>
              {focus && (
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Score distribution</p>
                    {sat.length > 1 && (
                      <select
                        value={focus.id}
                        onChange={(e) => setSelected(e.target.value)}
                        aria-label="Exam to show"
                        className="max-w-[60%] truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-slate-900"
                      >
                        {sat.map((e) => (
                          <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <CategoryBars
                    ariaLabel={`Score distribution for ${focus.title}`}
                    valueLabel="Students"
                    data={focus.distribution.map((d) => ({ name: `${d.band}%`, value: d.students }))}
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-white/10">
                  <th className="py-2 pr-4">Exam</th>
                  <th className="py-2 pr-4">Sat</th>
                  <th className="py-2 pr-4">Average</th>
                  <th className="py-2 pr-4">Median</th>
                  <th className="py-2 pr-4">High / low</th>
                  <th className="py-2 pr-4">Pass rate</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-2 pr-4">
                      <span className="text-slate-900 dark:text-white">{e.title}</span>
                      <span className="ml-2 text-xs text-slate-400">{KIND_LABELS[e.kind] ?? e.kind}</span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-slate-600 dark:text-slate-300">{e.responses}</td>
                    <td className="py-2 pr-4 tabular-nums text-slate-600 dark:text-slate-300">{pct(e.mean_percent)}</td>
                    <td className="py-2 pr-4 tabular-nums text-slate-600 dark:text-slate-300">{pct(e.median_percent)}</td>
                    <td className="py-2 pr-4 tabular-nums text-slate-600 dark:text-slate-300">
                      {e.responses ? `${pct(e.highest_percent)} / ${pct(e.lowest_percent)}` : '—'}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-slate-600 dark:text-slate-300">{pct(e.pass_rate)}</td>
                    <td className="py-2 text-xs">
                      {e.pending_review > 0 ? (
                        <span className="text-amber-700 dark:text-amber-300">{e.pending_review} to mark</span>
                      ) : e.results_released ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Released
                        </span>
                      ) : e.is_published ? (
                        <span className="text-slate-500">Open</span>
                      ) : (
                        <span className="text-slate-400">Draft</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-400">
              Pass mark 50%. The Excel file has a summary sheet and one sheet per exam with every
              student&rsquo;s mark on every question.
              {onOpenExams && (
                <>
                  {' '}
                  <button type="button" onClick={onOpenExams} className="font-medium text-blue-600 hover:underline dark:text-cyan-300">
                    Open Exams
                  </button>
                </>
              )}
            </p>
          </div>
        </>
      )}
    </Panel>
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
          : 'rounded-xl bg-slate-50 p-4 dark:bg-white/5'
      }
    >
      <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'flex items-center gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10'
          : `flex items-center gap-4 ${CARD}`
      }
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-200">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
