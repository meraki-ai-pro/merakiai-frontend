import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/services/api';

/**
 * Which course the student is studying right now.
 *
 * This exists because session creation needs a course_id and the app had no
 * way to choose one: `startNewSession` fell back to a hard-coded
 * DEFAULT_COURSE_ID ('froth-flotation'). On a single-course deployment that is
 * invisible; with a second course it silently starts every session on the
 * wrong one, and the backend's enrolment check then rejects it. The selection
 * is persisted so it survives a reload mid-study.
 */

export interface EnrolledCourse {
  id: string;
  name: string;
  status: string;
}

interface CourseState {
  courses: EnrolledCourse[];
  selectedCourseId: string | null;
  loading: boolean;

  setSelectedCourse: (courseId: string) => void;
  loadCourses: () => Promise<EnrolledCourse[]>;
  joinByCode: (code: string) => Promise<{ ok: boolean; message: string }>;
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      courses: [],
      selectedCourseId: null,
      loading: false,

      setSelectedCourse: (courseId) => set({ selectedCourseId: courseId }),

      loadCourses: async () => {
        set({ loading: true });
        try {
          // Two calls, because /enrolments returns course_id with no title and
          // /sessions/courses has the titles but not the enrolment status.
          //
          // allSettled, not all: only /enrolments is authoritative. The
          // catalogue supplies display names, and a transient failure there
          // used to reject the pair, empty the list, and leave an enrolled
          // student looking at "Join a course" — unable to start a session at
          // all. A missing title is worth degrading to the course id for.
          const [enrolSettled, catalogueSettled] = await Promise.allSettled([
            apiClient.listMyEnrolments(),
            apiClient.listCourses(),
          ]);

          if (enrolSettled.status === 'rejected' || !enrolSettled.value.success) {
            // Keep whatever was already known rather than claiming the student
            // is on no courses.
            set({ loading: false });
            return get().courses;
          }

          const catalogue =
            catalogueSettled.status === 'fulfilled'
              ? (catalogueSettled.value.data?.courses ?? [])
              : [];
          const titles = new Map(catalogue.map((c) => [c.id, c.name]));
          const enrolments = enrolSettled.value.data?.enrolments ?? [];

          // Withdrawn students lose access on their next turn, so offering the
          // course here would only produce a 403 later.
          const courses: EnrolledCourse[] = enrolments
            .filter((e) => e.status === 'active' || e.status === 'completed')
            .map((e) => ({
              id: e.course_id,
              name: titles.get(e.course_id) ?? e.course_id,
              status: e.status,
            }));

          const current = get().selectedCourseId;
          const stillValid = current && courses.some((c) => c.id === current);

          set({
            courses,
            loading: false,
            selectedCourseId: stillValid ? current : (courses[0]?.id ?? null),
          });
          return courses;
        } catch {
          set({ loading: false });
          return [];
        }
      },

      joinByCode: async (code) => {
        const res = await apiClient.joinCourseByCode(code.trim());
        if (!res.success || !res.data) {
          return {
            ok: false,
            // Surface the API's wording: it distinguishes an expired code from
            // a wrong one, and that difference is what the student needs.
            message: res.error?.message ?? 'That code was not accepted.',
          };
        }
        const joinedId = res.data.enrolment?.course_id;
        const courses = await get().loadCourses();
        if (joinedId && courses.some((c) => c.id === joinedId)) {
          set({ selectedCourseId: joinedId });
        }
        return { ok: true, message: 'You are enrolled.' };
      },
    }),
    {
      name: 'meraki-course',
      partialize: (state) => ({ selectedCourseId: state.selectedCourseId }),
    },
  ),
);
