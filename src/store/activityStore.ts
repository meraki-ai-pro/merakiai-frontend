import { create } from 'zustand';
import { apiClient } from '@/services/api';

export interface Activity {
  id: string;
  kind: 'lesson' | 'paper';
  title: string;
  required: boolean;
  session_id: string | null;
  assessment_id: string | null;
  created_at: string;
  status: 'todo' | 'done' | 'closed';
  /** Papers only: false until the paper's window opens. */
  available?: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
}

interface ActivityState {
  activities: Activity[];
  /** A required activity is unfinished: other sessions stay closed until it is done. */
  locked: boolean;
  /** Published exams this student can still sit now. */
  examsDue: number;
  refresh: (courseId: string | null) => Promise<void>;
}

/**
 * What the sidebar badges and the study lock read: the lecturer's assigned
 * activities (Intervention Studio) and the exams waiting to be sat. The server
 * enforces the lock (423); this store only lets the UI explain it instead of
 * failing a click.
 */
export const useActivityStore = create<ActivityState>()((set) => ({
  activities: [],
  locked: false,
  examsDue: 0,
  refresh: async (courseId) => {
    if (!courseId) return set({ activities: [], locked: false, examsDue: 0 });
    const [acts, exams] = await Promise.all([
      apiClient.listActivities(courseId),
      apiClient.listAvailableAssessments(courseId),
    ]);
    const now = Date.now();
    set({
      activities: acts.data?.activities ?? [],
      locked: acts.data?.locked ?? false,
      examsDue: (exams.data?.assessments ?? []).filter(
        (a) =>
          !a.completed &&
          (!a.opens_at || new Date(a.opens_at).getTime() <= now) &&
          (!a.closes_at || new Date(a.closes_at).getTime() > now),
      ).length,
    });
  },
}));

/** Sessions that stay open while locked: the student's own unfinished required lessons. */
export function openWhileLocked(activities: Activity[]): Set<string> {
  return new Set(
    activities
      .filter((a) => a.required && a.status === 'todo' && a.session_id)
      .map((a) => a.session_id as string),
  );
}
