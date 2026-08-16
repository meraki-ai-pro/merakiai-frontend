/**
 * Lecturer-side shapes.
 *
 * These mirror the /lecturer and /render endpoints. Every field the API can
 * omit is optional here — a dashboard that crashes because a course has no
 * academic_level yet is worse than one that renders a dash.
 */

/**
 * Ghanaian academic levels. Students say "I'm in Level 200"; the technical
 * universities award HNDs. Mirrors app/core/academic_levels.py — that module
 * is the source of truth and GET /lecturer/courses/academic-levels serves it,
 * so prefer fetching over hard-coding a list in a component.
 */
export type AcademicLevel =
  | 'access'
  | 'level_100'
  | 'level_200'
  | 'level_300'
  | 'level_400'
  | 'level_500'
  | 'level_600'
  | 'hnd'
  | 'masters'
  | 'doctoral';

export interface AcademicLevelOption {
  code: AcademicLevel;
  label: string;
  short: string;
  tier: 'foundation' | 'intermediate' | 'advanced' | 'masters' | 'doctoral';
  note: string;
}

export type TutorModeName = 'learn' | 'review' | 'application';

export type EnrolmentStatus = 'active' | 'completed' | 'withdrawn' | 'archived';

/**
 * A student's own enrolment row, as returned by GET /enrolments.
 *
 * The API returns course_id only — there is no join to the course name — so a
 * caller wanting a title has to resolve it against GET /sessions/courses.
 */
export interface Enrolment {
  id: string;
  course_id: string;
  status: EnrolmentStatus;
  enrolled_at?: string | null;
  completed_at?: string | null;
}

export interface LecturerCourse {
  id: string;
  name: string;
  description?: string | null;
  persona?: string | null;
  domain_topics?: string[];
  academic_level?: AcademicLevel | null;
  practice_mode_enabled?: boolean;
  owner_id?: string | null;
  created_at?: string;
  /** Present on the list endpoint only. */
  document_count?: number;
  published_document_count?: number;
  student_count?: number;
}

export interface LecturerCourseCreate {
  id: string;
  name: string;
  description?: string | null;
  persona?: string | null;
  domain_topics?: string[];
  academic_level?: AcademicLevel | null;
  practice_mode_enabled?: boolean;
}

export interface KnowledgeFile {
  id: string;
  title: string;
  source_filename: string;
  doc_type: string;
  default_mode: TutorModeName;
  target_modes?: TutorModeName[] | null;
  is_published?: boolean;
  topic?: string | null;
  difficulty?: string;
  status: 'processing' | 'ready' | 'failed' | 'no_content';
  total_chunks?: number;
  version?: string;
  storage_path?: string | null;
  created_at?: string;
}

export interface KnowledgeUploadOptions {
  docType?: string;
  defaultMode?: TutorModeName;
  difficulty?: string;
  version?: string;
  targetModes?: TutorModeName[];
  topic?: string;
  /** Defaults to false — the lecturer flow is upload, test, then publish. */
  isPublished?: boolean;
}

export interface KnowledgePatch {
  is_published?: boolean;
  topic?: string;
  title?: string;
}

export interface TestQueryResult {
  text: string;
  source_filename?: string | null;
  section_title?: string | null;
  page?: number | null;
  score: number;
  relevance_band?: string;
}

export interface TestQueryResponse {
  question: string;
  mode: string;
  results: TestQueryResult[];
  count: number;
}

export interface InviteCode {
  id: string;
  code: string;
  max_uses?: number | null;
  uses_count: number;
  expires_at?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface CourseStudent {
  id: string;
  student_id: string;
  status: EnrolmentStatus;
  enrolled_at?: string;
  completed_at?: string | null;
  withdrawn_at?: string | null;
  profile?: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    university_name?: string | null;
  } | null;
}

export interface CourseAnalytics {
  course_id: string;
  students: {
    total: number;
    active: number;
    completed: number;
    withdrawn: number;
    ever_opened_a_session: number;
    enrolled_but_never_started: number;
  };
  sessions: {
    total: number;
    by_mode: Record<TutorModeName, number>;
  };
  knowledge: { total: number; published: number; draft: number; failed: number };
  videos: { total: number; awaiting_review: number; approved: number; failed: number };
  /** Metrics that need tasks #20/#21 — shown as "not yet measured", never 0. */
  unavailable: string[];
}

export interface RenderAsset {
  id: string;
  concept_key: string;
  topic?: string | null;
  renderer: 'manim' | 'remotion' | 'did' | 'tavus';
  archetype?: string | null;
  status: 'queued' | 'rendering' | 'ready' | 'failed';
  error?: string | null;
  duration_seconds?: number | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  review_note?: string | null;
  scene_code?: string | null;
  source_script?: string | null;
  created_at?: string;
}

export interface RenderRequestBody {
  course_id: string;
  concept_key: string;
  source_script: string;
  archetype?: string | null;
  topic?: string | null;
  subject?: string | null;
}
