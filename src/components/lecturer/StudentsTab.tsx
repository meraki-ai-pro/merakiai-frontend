'use client';

/**
 * Students tab: invite codes, class list, enrolment status.
 *
 * Completion and departure are deliberately different actions here, because
 * they are different states: a completed student keeps access to the material,
 * a withdrawn one loses it on their next turn.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, Plus, Ticket } from 'lucide-react';
import { apiClient } from '@/services/api';
import type { CourseStudent, EnrolmentStatus, InviteCode } from '@/types/lecturer';

const STATUS_STYLES: Record<EnrolmentStatus, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  completed: 'text-blue-600 dark:text-cyan-300',
  withdrawn: 'text-slate-400',
  archived: 'text-slate-400',
};

export function StudentsTab({ courseId }: { courseId: string }) {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      apiClient.listInviteCodes(courseId),
      apiClient.listCourseStudents(courseId),
    ]);
    setCodes(c?.data?.invite_codes ?? []);
    setStudents(s?.data?.students ?? []);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createCode = async () => {
    const res = await apiClient.createInviteCode(courseId);
    if (!res.success) {
      toast.error('Could not create an invite code');
      return;
    }
    toast.success('Invite code created');
    void load();
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const addStudent = async () => {
    if (!email.trim()) return;
    const res = await apiClient.addCourseStudent(courseId, email.trim());
    if (!res.success) {
      // The API explains that an unknown email needs an invite code instead of
      // silently doing nothing — surface that message verbatim.
      toast.error(res.error?.message ?? 'Could not add the student');
      return;
    }
    toast.success('Student enrolled');
    setEmail('');
    void load();
  };

  const setStatus = async (student: CourseStudent, status: EnrolmentStatus) => {
    if (
      status === 'withdrawn' &&
      !window.confirm('Withdraw this student? They lose access on their next question.')
    ) {
      return;
    }
    const res = await apiClient.changeEnrolmentStatus(courseId, student.id, status);
    if (!res.success) {
      toast.error('Could not change status');
      return;
    }
    void load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
            <Ticket className="h-4 w-4" /> Invite codes
          </h2>
          <button
            type="button"
            onClick={createCode}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" /> New code
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Read one out in class. Students enter it when they sign up and land straight on this
          course.
        </p>

        {codes.length > 0 && (
          <ul className="mt-4 space-y-2">
            {codes.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-white/10"
              >
                <div className="flex items-center gap-3">
                  {/* Wide tracking because these get read off a projector. */}
                  <code className="font-mono text-lg tracking-[0.2em] text-slate-900 dark:text-white">
                    {c.code}
                  </code>
                  <span className="text-xs text-slate-400">
                    {c.uses_count} used
                    {c.max_uses ? ` of ${c.max_uses}` : ''}
                    {!c.is_active && ' · inactive'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(c.code)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                  title="Copy"
                >
                  {copied === c.code ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="font-medium text-slate-900 dark:text-white">Add an existing account</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addStudent()}
            placeholder="student@university.edu.gh"
            className="min-w-[16rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={addStudent}
            disabled={!email.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900"
          >
            Enrol
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-slate-900 dark:text-white">
          Class list ({students.length})
        </h2>
        {students.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
            Nobody has joined yet. Share an invite code.
          </p>
        ) : (
          <ul className="space-y-2">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {s.profile?.first_name || s.profile?.last_name
                      ? `${s.profile?.first_name ?? ''} ${s.profile?.last_name ?? ''}`.trim()
                      : (s.profile?.email ?? s.student_id)}
                  </p>
                  <p className="truncate text-xs text-slate-500">{s.profile?.email}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                    {s.status}
                  </span>
                  <select
                    value={s.status}
                    onChange={(e) => void setStatus(s, e.target.value as EnrolmentStatus)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-white/15 dark:bg-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
        {/* Stated explicitly because the two are easy to confuse and have very
            different consequences for the student. */}
        <p className="mt-3 text-xs text-slate-400">
          Completed students keep access to the material. Withdrawn students lose it on their next
          question.
        </p>
      </section>
    </div>
  );
}
