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

// ─── Application (Practice) session types ────────────────────────────────────
// These are sent as session_type to the backend. The backend mode is
// 'application'; the UI labels them as "Practice" for student-facing copy.
//
// The values must stay domain-neutral. They are not opaque ids: the backend
// puts session_type into the retrieval seed and states it in the prompt
// (modes_sessions/service.py), so the froth-flotation values these once had —
// flotation_basics, reagents, surface_chemistry — were steering retrieval on
// every other course. A Calculus student picking "Core Concepts" was asking
// for flotation basics.
export const PRACTICE_SESSION_TYPES = [
  { value: 'core_concepts',     label: 'Core Concepts' },
  { value: 'key_terms',         label: 'Key Terms' },
  { value: 'applied_concepts',  label: 'Applied Concepts' },
  { value: 'problem_solving',   label: 'Problem Solving' },
  { value: 'advanced_concepts', label: 'Advanced Concepts' },
] as const;

// ─── Review session types ─────────────────────────────────────────────────────
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
    value: 'flashcard',
    label: 'Flashcard',
    desc: 'Explain a concept shown on the front',
  },
  {
    value: 'short_answer',
    label: 'Short Answer',
    desc: 'Write a concise answer to an exam-style question',
  },
] as const;

export const DIFFICULTY_LEVELS = ['Basic', 'Intermediate', 'Advanced'] as const;

// ─── Last-resort course id ────────────────────────────────────────────────────
// Empty on purpose. A session's course now comes from the student's own
// enrolments via the course switcher (see courseStore); this is only consulted
// when that yields nothing, and falling back to a hard-coded course sent every
// such session to froth-flotation regardless of what the student was enrolled
// on. Empty means "ask them to pick one" instead of guessing wrong.
export const DEFAULT_COURSE_ID = '';
