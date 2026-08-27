// NEXT_PUBLIC_API_BASE lets you route HTTP through the same-origin Next proxy
// (set it to "/api/backend") to avoid CORS/ngrok issues while keeping WS direct.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function toWebSocketUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') url.protocol = 'wss:';
    if (url.protocol === 'http:') url.protocol = 'ws:';

    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      url.protocol === 'ws:'
    ) {
      url.protocol = 'wss:';
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return value.replace(/\/$/, '');
  }
}

function getWebSocketBaseUrl() {
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (configuredWsUrl) return toWebSocketUrl(configuredWsUrl);

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredApiUrl) return toWebSocketUrl(configuredApiUrl);

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  return 'ws://localhost:8000';
}

export const WS_URL = getWebSocketBaseUrl();

export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_SIGNUP: '/auth/signup',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  // Signed-in password change. Distinct from reset: this one requires the
  // current password, so a stolen token alone cannot take an account over.
  AUTH_UPDATE_PASSWORD: '/auth/update-password',

  // RAG/Chat (Learn mode voice input only — text goes via WebSocket)
  RAG_TURN: '/rag/turn',
  RAG_STATUS: (taskId: string) => `/rag/status/${taskId}`,
  RAG_TRANSCRIBE: '/rag/transcribe',
  RAG_TURN_VOICE: '/rag/turn/voice',

  // Sessions
  SESSIONS_COURSES: '/sessions/courses',
  SESSIONS_CREATE: '/sessions/',
  SESSIONS_GET: (id: string) => `/sessions/${id}`,
  SESSIONS_MODE: (id: string) => `/sessions/${id}/mode`,
  SESSIONS_VIDEO: (id: string) => `/sessions/${id}/video`,
  SESSIONS_END: (id: string) => `/sessions/${id}/end`,
  SESSIONS_CONVERSATIONS: (id: string) => `/sessions/${id}/conversations`,

  // Users
  USERS_ME: '/users/me',
  USERS_AVATAR: '/users/me/avatar',
  USERS_AVATAR_UPDATE: '/users/me/avatar',

  // Feedback
  FEEDBACK_SESSION_SURVEY: '/feedback/session-survey',
  FEEDBACK_USER: '/feedback/user-feedback',

  // Mode Sessions voice turns (text turns go via WebSocket)
  MODE_SESSIONS_STATUS: (taskId: string) => `/mode-sessions/status/${taskId}`,
  MODE_SESSIONS_TURN_VOICE: (id: string) => `/mode-sessions/${id}/turn/voice`,
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  SESSION_NOT_FOUND: 'Session not found.',
  UNAUTHORIZED: 'Unauthorized. Please log in.',
  REVIEW_MODE_NO_VIDEO: 'Review mode is text-only. Video responses are disabled.',
  NO_COURSE_SELECTED: 'Please select a course before starting a session.',
} as const;

export const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
} as const;

// ─── Roles ───────────────────────────────────────────────────────────────────
// Mirrors ADMIN_ROLES in app/core/auth.py. A `super_admin` IS an admin and
// then some; writing `role === 'admin'` locks them out of the very console
// they have the most authority over — which is exactly what happened, and it
// made the super-admin-only role management unreachable by super admins.
//
// A lecturer is deliberately absent: lecturer authority is scoped to owned
// courses, never platform-wide.
export const ADMIN_ROLES = ['admin', 'super_admin'] as const;

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes((role ?? '') as (typeof ADMIN_ROLES)[number]);
}

// ─── Mode vocabulary ─────────────────────────────────────────────────────────
// The product says Learn / Review / Assessment. The WIRE VALUE for the third
// is still 'application' — renaming it would touch sessions, mode_sessions,
// document_chunks, every stored conversation and the Pinecone namespaces, for
// no user-visible benefit. So: 'application' on the wire, "Assessment" in
// anything a person reads. Use MODE_LABELS rather than writing either word by
// hand, which is how "Practice" ended up in nine components and this file.
export type TutorMode = 'learn' | 'review' | 'application';

export const MODE_LABELS: Record<TutorMode, string> = {
  learn: 'Learn',
  review: 'Review',
  application: 'Assessment',
};

export const MODE_LABELS_PLURAL: Record<TutorMode, string> = {
  learn: 'Learn',
  review: 'Review',
  application: 'Assessments',
};

/** Label for a mode value from anywhere, including legacy 'practice' rows. */
export function modeLabel(mode: string | null | undefined): string {
  const key = (mode ?? '').toLowerCase();
  if (key === 'practice') return MODE_LABELS.application; // pre-rename rows
  return MODE_LABELS[key as TutorMode] ?? 'Learn';
}

// ─── Assessment (application) scenario types ─────────────────────────────────
// The picker these fed is GONE — removed at the client's request. The five
// options were generic labels a student had no basis to choose between, and
// picking one narrowed the retrieval seed to a slice of the course for no
// pedagogical reason. New sessions send no session_type and the server fills
// in a neutral placeholder.
//
// Kept only to LABEL sessions started before the change: mode_sessions rows
// carry these values, and an old session that rendered as "Assessment —
// problem_solving" must not start rendering as "Assessment — undefined".
export const LEGACY_SCENARIO_TYPE_LABELS: Record<string, string> = {
  core_concepts: 'Core Concepts',
  key_terms: 'Key Terms',
  applied_concepts: 'Applied Concepts',
  problem_solving: 'Problem Solving',
  advanced_concepts: 'Advanced Concepts',
  general: 'General',
};

// ─── Review question formats ─────────────────────────────────────────────────
// Flashcard was removed at the client's request. The backend still ACCEPTS it
// on the wire, because a student half-way through a flashcard set when this
// shipped must be able to finish it — it is simply no longer offered.
export const REVIEW_SESSION_TYPES = [
  {
    value: 'mcq',
    label: 'Multiple Choice',
    desc: 'Pick the correct answer from 4 options',
  },
  {
    value: 'fill_blank',
    label: 'Fill in the Blank',
    desc: 'Complete the sentence with the missing term',
  },
  {
    value: 'short_answer',
    label: 'Short Answer',
    desc: 'Write a concise answer to an exam-style question',
  },
] as const;

/** The same three formats as the lecturer tags uploaded Review material with. */
export const QUESTION_FORMATS = REVIEW_SESSION_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
})) as ReadonlyArray<{ value: string; label: string }>;

export const DIFFICULTY_LEVELS = ['Basic', 'Intermediate', 'Advanced'] as const;

/** What the API stores: lowercase, matching documents_difficulty_check. */
export const DIFFICULTY_VALUES = ['basic', 'intermediate', 'advanced'] as const;

// ─── Last-resort course id ────────────────────────────────────────────────────
// Empty on purpose. A session's course now comes from the student's own
// enrolments via the course switcher (see courseStore); this is only consulted
// when that yields nothing, and falling back to a hard-coded course sent every
// such session to froth-flotation regardless of what the student was enrolled
// on. Empty means "ask them to pick one" instead of guessing wrong.
export const DEFAULT_COURSE_ID = '';
