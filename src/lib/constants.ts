export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

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
export const PRACTICE_SESSION_TYPES = [
  { value: 'flotation_basics',   label: 'Core Concepts' },
  { value: 'reagents',           label: 'Key Terms' },
  { value: 'process_variables',  label: 'Applied Concepts' },
  { value: 'troubleshooting',    label: 'Problem Solving' },
  { value: 'surface_chemistry',  label: 'Advanced Concepts' },
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

// ─── Default course — used when no course has been explicitly selected ─────────
// Update this to match a real course id from GET /sessions/courses
export const DEFAULT_COURSE_ID = 'froth-flotation';
