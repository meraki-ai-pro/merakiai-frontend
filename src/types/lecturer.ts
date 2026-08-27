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
  /**
   * Free text, used ONLY as a fallback when a video request names no
   * archetype. Before this existed the UI sent a hard-coded "mathematics" on
   * every render request, so an untyped Biology or Chemistry video was routed
   * to Manim - an engine for continuous mathematics.
   */
  subject?: string | null;
  /**
   * Which recorded voice narrates this course — concept videos AND the
   * Learn-mode lesson board. Null means the default narrator.
   */
  lecturer_voice_id?: string | null;
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
  subject?: string | null;
  domain_topics?: string[];
  academic_level?: AcademicLevel | null;
  practice_mode_enabled?: boolean;
}

/** The three formats a Review file can be turned into. Flashcard is gone. */
export type QuestionFormat = 'mcq' | 'fill_blank' | 'short_answer';

export type DifficultyValue = 'basic' | 'intermediate' | 'advanced';

export interface KnowledgeFile {
  id: string;
  title: string;
  source_filename: string;
  doc_type: string;
  default_mode: TutorModeName;
  target_modes?: TutorModeName[] | null;
  is_published?: boolean;
  topic?: string | null;
  /**
   * For Review material this is the question difficulty; for Assessment
   * material it is the scenario difficulty. One column, because the meaning is
   * the same - how hard should what comes out of this file be - and two
   * columns would drift.
   */
  difficulty?: DifficultyValue | string;
  /** Review material only. Null means "any format" - the pre-tagging default. */
  question_formats?: QuestionFormat[] | null;
  status: 'processing' | 'ready' | 'failed' | 'no_content';
  total_chunks?: number;
  version?: string;
  storage_path?: string | null;
  created_at?: string;
}

export interface KnowledgeUploadOptions {
  docType?: string;
  defaultMode?: TutorModeName;
  difficulty?: DifficultyValue;
  version?: string;
  targetModes?: TutorModeName[];
  topic?: string;
  /** Review material only; rejected by the API on a file not serving Review. */
  questionFormats?: QuestionFormat[];
  /** Defaults to false — the lecturer flow is upload, test, then publish. */
  isPublished?: boolean;
}

export interface KnowledgePatch {
  is_published?: boolean;
  topic?: string;
  title?: string;
  difficulty?: DifficultyValue;
  question_formats?: QuestionFormat[];
}

/**
 * What POST .../students/import reports back.
 *
 * `invited` is separate from `enrolled` on purpose: those addresses have no
 * account yet and are NOT on the course until the student signs up. Folding
 * them into one number would tell a lecturer their class was enrolled when it
 * was not.
 */
/**
 * A voice the lecturer recorded, cloned at ElevenLabs.
 *
 * The provider's voice id is deliberately NOT here. The server resolves a
 * course's voice and returns audio; handing the id to a browser would be
 * handing out something anyone with our API key could speak as.
 */
export interface LecturerVoice {
  id: string;
  name: string;
  provider: string;
  status: 'pending' | 'ready' | 'failed';
  error?: string | null;
  sample_seconds?: number | null;
  created_at?: string;
  /** Courses this voice currently speaks for. */
  courses?: { id: string; name: string }[];
}

export interface RosterImportResult {
  status: string;
  filename?: string | null;
  rows_read: number;
  enrolled: number;
  reactivated: number;
  already_enrolled: number;
  invited: number;
  invited_emails: string[];
  failed: { row?: number; email?: string; reason: string }[];
}

export interface EnrolmentInvitation {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  status: 'pending' | 'accepted' | 'cancelled';
  created_at?: string;
  accepted_at?: string | null;
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

export type MasteryBand = 'secure' | 'developing' | 'struggling';

export interface MasterySummary {
  measured: boolean;
  reason?: string;
  students_tracked?: number;
  topics_tracked?: number;
  bands?: Record<MasteryBand, number>;
  weakest_topics?: { topic: string; mean: number; students: number }[];
  strongest_topics?: { topic: string; mean: number; students: number }[];
}

export interface EngagementSummary {
  measured: boolean;
  reason?: string;
  turns?: number;
  citations_clicked?: number;
  sources_opened?: number;
  videos_completed?: number;
  narration_played?: number;
  /** How often retrieval came back empty - what to upload next. */
  empty_retrievals?: number;
}

export interface TimeOnTask {
  measured: boolean;
  reason?: string;
  completed_sessions?: number;
  open_sessions?: number;
  total_minutes?: number;
  mean_minutes?: number;
  /** Reported next to the mean because the distribution is badly skewed. */
  median_minutes?: number;
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
    non_student_session_users?: number;
  };
  sessions: {
    total: number;
    by_mode: Record<TutorModeName, number>;
  };
  knowledge: { total: number; published: number; draft: number; failed: number };
  videos: { total: number; awaiting_review: number; approved: number; failed: number };
  mastery: MasterySummary;
  engagement: EngagementSummary;
  time_on_task: TimeOnTask;
  /** Metrics not yet instrumented - shown as "not yet measured", never 0. */
  unavailable: string[];
}

export interface CourseMastery {
  measured: boolean;
  reason?: string;
  topics: {
    topic: string;
    students: number;
    mean: number;
    attempts: number;
    bands: Record<MasteryBand, number>;
  }[];
  students: {
    student_id: string;
    name?: string | null;
    email?: string | null;
    topics_tracked: number;
    mean: number;
    band: MasteryBand;
    struggling_topics: string[];
    last_practised_at?: string | null;
  }[];
}

export type NarrationStatus =
  | 'pending'
  | 'narrating'
  | 'ready'
  | 'failed'
  | 'skipped';

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
  /**
   * Narration is a SECOND job on a different worker - the render container
   * carries no TTS client on purpose - so a video is briefly `ready` with no
   * audio. That is a real state, and the review queue shows it rather than
   * pretending the video is finished.
   */
  has_audio?: boolean;
  narration_status?: NarrationStatus;
  narration_script?: string | null;
  /** Revision chain: which asset this one supersedes, and why. */
  revision?: number;
  parent_asset_id?: string | null;
  revision_note?: string | null;
}

export interface RenderRegenerateBody {
  source_script: string;
  archetype?: string | null;
  topic?: string | null;
  subject?: string | null;
  /** What the lecturer changed. Kept on the record with the revision. */
  note?: string | null;
}

export interface RenderRequestBody {
  course_id: string;
  concept_key: string;
  source_script: string;
  archetype?: string | null;
  topic?: string | null;
  subject?: string | null;
}
