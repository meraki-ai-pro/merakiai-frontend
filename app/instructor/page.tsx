'use client';

/**
 * Multi-course home. One lecturer owns any number of courses; this is the
 * landing surface described in Lecturer doc §2.2.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, BookOpen, FileText, GraduationCap, Plus, Users } from 'lucide-react';
import { apiClient } from '@/services/api';
import type { AcademicLevel, AcademicLevelOption, InstructorCourse } from '@/types/instructor';

// Mirrors _COURSE_ID_RE in app/api/v1/lecturer/courses.py. Validated here too
// so the lecturer sees the rule while typing rather than as a 400 afterwards.
const ID_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export default function InstructorHome() {
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await apiClient.listInstructorCourses();
    setCourses(res?.data?.courses ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-44 animate-pulse rounded-[28px] border border-white/70 bg-white/55 dark:border-white/10 dark:bg-white/[0.05]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/[0.08] dark:text-cyan-200">
            <GraduationCap className="h-3.5 w-3.5" /> Teaching workspace
          </span> 
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Your courses</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {courses.length === 0
              ? 'Create a course to upload your notes and invite students.'
              : `${courses.length} course${courses.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
        >
          <Plus className="h-4 w-4" /> New course
        </button>
      </div>

      {creating && (
        <CreateCourseForm
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void load();
          }}
        />
      )}

      {courses.length === 0 && !creating ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: InstructorCourse }) {
  const drafts = (course.document_count ?? 0) - (course.published_document_count ?? 0);
  return (
    <Link
      href={`/instructor/${course.id}`}
      className="group block rounded-[28px] border border-white/70 bg-white/[0.72] p-6 shadow-lg shadow-blue-950/[0.05] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-950 dark:text-white">{course.name}</h2>
          <p className="mt-1 truncate font-mono text-xs text-slate-400">{course.id}</p>
        </div>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-cyan-300/[0.12] dark:text-cyan-200">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5 rounded-full bg-slate-950/[0.04] px-3 py-1.5 dark:bg-white/[0.06]">
          <Users className="h-3.5 w-3.5" /> {course.student_count ?? 0} students
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-slate-950/[0.04] px-3 py-1.5 dark:bg-white/[0.06]">
          <FileText className="h-3.5 w-3.5" /> {course.published_document_count ?? 0} live
        </span>
      </div>

      {/* Drafts are surfaced on the card: a file uploaded and never published
          is invisible to students, and that is easy to forget. */}
      {drafts > 0 && (
        <p className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/[0.08] dark:text-amber-200">
          {drafts} draft{drafts === 1 ? '' : 's'} not visible to students
        </p>
      )}
    </Link>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-[32px] border border-dashed border-blue-200 bg-white/[0.5] p-12 text-center shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/[0.04]">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-cyan-300/[0.12] dark:text-cyan-200">
        <BookOpen className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">No courses yet</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
        A course holds your teaching notes, its own students, and the videos
        generated from your material.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950"
      >
        Create your first course
      </button>
    </div>
  );
}

function CreateCourseForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  // Fetched, not hard-coded: the dropdown, the CHECK constraint and the
  // teaching prompts all read from app/core/academic_levels.py.
  const [levels, setLevels] = useState<AcademicLevelOption[]>([]);
  const [level, setLevel] = useState<AcademicLevel>('level_100');

  useEffect(() => {
    void apiClient.listAcademicLevels().then((r) => setLevels(r?.data?.levels ?? []));
  }, []);
  const [busy, setBusy] = useState(false);
  const [touchedId, setTouchedId] = useState(false);

  // Suggest a slug from the title until the lecturer edits it themselves.
  const suggested = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  const effectiveId = touchedId ? id : suggested;
  const idValid = ID_RE.test(effectiveId);

  const submit = async () => {
    if (!name.trim() || !idValid) return;
    setBusy(true);
    const res = await apiClient.createInstructorCourse({
      id: effectiveId,
      name: name.trim(),
      academic_level: level,
    });
    setBusy(false);

    if (!res.success) {
      toast.error(res.error?.message ?? 'Could not create the course');
      return;
    }
    toast.success('Course created');
    onCreated();
  };

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/[0.72] p-6 shadow-xl shadow-blue-950/[0.06] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">New course</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Course name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Calculus I"
            className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-200/70 dark:border-white/10 dark:bg-white/[0.06]"
          />
        </label>

        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Course id</span>
          <input
            value={effectiveId}
            onChange={(e) => {
              setTouchedId(true);
              setId(e.target.value);
            }}
            placeholder="calculus-101"
            className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 font-mono text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-200/70 dark:border-white/10 dark:bg-white/[0.06]"
          />
          {/* Explains WHY the format is constrained — it is not arbitrary. */}
          <span className="mt-1 block text-xs text-slate-400">
            {effectiveId && !idValid
              ? 'Lowercase letters, digits and hyphens only.'
              : 'Used in file storage and search — cannot be changed later.'}
          </span>
        </label>

        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Level</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as AcademicLevel)}
            className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-200/70 dark:border-white/10 dark:bg-slate-900"
          >
            {levels.map((l) => (
              <option key={l.code} value={l.code} title={l.note}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !name.trim() || !idValid}
          className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-40 dark:bg-cyan-300 dark:text-slate-950"
        >
          {busy ? 'Creating…' : 'Create course'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-950/[0.05] dark:text-slate-300 dark:hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
