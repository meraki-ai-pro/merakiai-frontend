'use client';

/**
 * Multi-course home. One lecturer owns any number of courses; this is the
 * landing surface described in Lecturer doc §2.2.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BookOpen, FileText, Plus, Users } from 'lucide-react';
import { apiClient } from '@/services/api';
import type { AcademicLevel, AcademicLevelOption, LecturerCourse } from '@/types/lecturer';

// Mirrors _COURSE_ID_RE in app/api/v1/lecturer/courses.py. Validated here too
// so the lecturer sees the rule while typing rather than as a 400 afterwards.
const ID_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export default function LecturerHome() {
  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await apiClient.listLecturerCourses();
    setCourses(res?.data?.courses ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading your courses…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Your courses</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {courses.length === 0
              ? 'Create a course to upload your notes and invite students.'
              : `${courses.length} course${courses.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: LecturerCourse }) {
  const drafts = (course.document_count ?? 0) - (course.published_document_count ?? 0);
  return (
    <Link
      href={`/lecturer/${course.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-md dark:border-white/10 dark:bg-white/5"
    >
      <h2 className="truncate font-semibold text-slate-900 dark:text-white">{course.name}</h2>
      <p className="mt-0.5 truncate font-mono text-xs text-slate-400">{course.id}</p>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {course.student_count ?? 0} students
        </span>
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> {course.published_document_count ?? 0} live
        </span>
      </div>

      {/* Drafts are surfaced on the card: a file uploaded and never published
          is invisible to students, and that is easy to forget. */}
      {drafts > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          {drafts} draft{drafts === 1 ? '' : 's'} not visible to students
        </p>
      )}
    </Link>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-white/15">
      <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-4 font-medium text-slate-900 dark:text-white">No courses yet</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
        A course holds your teaching notes, its own students, and the videos
        generated from your material.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
    const res = await apiClient.createLecturerCourse({
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h2 className="font-medium text-slate-900 dark:text-white">New course</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Course name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Calculus I"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-slate-900"
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
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm dark:border-white/15 dark:bg-slate-900"
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
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-slate-900"
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
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {busy ? 'Creating…' : 'Create course'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
