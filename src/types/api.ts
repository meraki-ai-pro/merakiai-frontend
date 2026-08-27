import type { TutorMode } from './chat';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export interface SignupResponse {
  user: {
    id?: string;
    email?: string;
  };
  session: {
    access_token?: string | null;
  };
  note?: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  university_name: string;
  region: string;
  country: string;
}

// ─── RAG/Chat (Learn mode) ────────────────────────────────────────────────────
export interface RagTurnRequest {
  session_id: string;
  mode: 'learn';
  message: string;
}

export interface RagTurnResponse {
  mode: 'learn';
  response: string;
  response_format: 'text' | 'video';
  video_url?: string | null;
  subtitles_url?: string | null;
  audio_url?: string | null;
  did_payload?: unknown;
}

export interface VoiceTurnResponse extends RagTurnResponse {
  transcript: string;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

/** POST /sessions/ — now requires course_id */
export interface CreateSessionRequest {
  course_id: string;
  mode?: 'learn' | 'application' | 'review';
  prefers_video?: boolean;
}

export interface CreateSessionResponse {
  /** Backend returns 'session_id' */
  session_id: string;
  course_id: string;
  current_mode: 'learn' | 'application' | 'review';
  prefers_video: boolean;
  started_at: string;
}

export interface SessionDetailsResponse {
  session_id: string;
  current_mode: 'learn' | 'application' | 'review';
  prefers_video: boolean;
  started_at: string;
  ended_at?: string | null;
}

export interface SessionModeUpdateRequest {
  // Backend accepts: 'learn' | 'application' | 'review'
  current_mode: 'learn' | 'application' | 'review';
}

export interface SessionModeUpdateResponse {
  session_id: string;
  current_mode: 'learn' | 'application' | 'review';
  prefers_video: boolean;
}

export interface VideoToggleRequest {
  prefers_video: boolean;
}

export interface VideoToggleResponse {
  session_id: string;
  prefers_video: boolean;
}

export interface EndSessionResponse {
  session_id: string;
  status: 'ended';
  ended_at: string;
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export interface UserProfileResponse {
  id: string;
  email: string;
  role: string;
  /** Null until the account fills them in — a Google sign-up has none. */
  first_name?: string | null;
  last_name?: string | null;
  university_name?: string | null;
  region?: string | null;
  country?: string | null;
  profile_picture_url?: string | null;
  avatar_id: string;
  avatar_provider: string;
  avatar_gender: 'male' | 'female';
  voice_provider: string;
  voice_id: string;
  voice_gender: 'male' | 'female';
  created_at: string;
}

/**
 * PATCH /users/me. Every field optional and only the changed ones are sent —
 * the API uses exclude_unset, so posting the whole form would not blank
 * anything, but sending less is still less to get wrong.
 *
 * `email` and `role` are deliberately absent: email is an auth identity that
 * needs Supabase's verification round trip, and a self-service role field
 * would be a privilege escalation.
 */
export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  university_name?: string;
  region?: string;
  country?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AvatarSelectRequest {
  avatar_id: string;
}

export interface AvatarSelectResponse {
  status: 'ok';
  avatar_id: string;
  voice_id: string;
  did_presenter_id: string;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export interface SessionSurveyRequest {
  session_id: string;
  clarity_rating: number;
  helpfulness_rating: number;
  confidence_rating: number;
  overall_rating: number;
}

export interface UserFeedbackRequest {
  session_id?: string | null;
  /**
   * What the person was studying or teaching.
   *
   * Without it, "the derivative in step 3 is wrong" arrives in the admin inbox
   * as an orphaned sentence. The server prefers the session's own course when
   * there is a session, so this only decides the attribution for feedback sent
   * outside one — which is most of it, and all of a lecturer's.
   */
  course_id?: string | null;
  feedback_type: 'bug' | 'suggestion' | 'content' | 'ux' | 'other';
  message: string;
}

export interface FeedbackResponse {
  status: 'ok';
  id?: string | null;
}

// ─── Mode Sessions (Application / Review) ────────────────────────────────────
//
// NOTE: The backend uses 'application' for what the UI labels "Assessment".
//       All API types use 'application'; the UI layer translates for display.

export interface ModeSessionStartRequest {
  session_id: string;
  // 'application' = what UI calls "Assessment"
  mode: 'application' | 'review';
  session_type: string;
  difficulty?: 'Basic' | 'Intermediate' | 'Advanced';
  total_items?: number | null;
}

export interface ModeSessionTurnRequest {
  message: string;
}

// Delivery block returned by backend for video/audio
export interface DeliveryBlock {
  response_format: 'text' | 'video';
  video_url?: string | null;
  audio_url?: string | null;
  subtitles_url?: string | null;
}

export type TaskStatus =
  | 'queued'
  | 'processing'
  | 'pending'
  | 'completed'
  | 'complete'
  | 'done'
  | 'success'
  | 'succeeded'
  | 'failed'
  | 'error';

export interface TaskStatusResponse {
  status: TaskStatus | string;
  task_id?: string;
  result?: unknown;
  data?: unknown;
  error?: string | null;
  message?: string | null;
}

// ─── WebSocket acknowledgement types ─────────────────────────────────────────
// The WebSocket now delivers task results via push (not polling).
// These ack types are returned immediately after sending a WS message.

export interface WsProcessingAck {
  status: 'processing';
  task_id: string;
  mode_session_id?: string;
}

export interface WsEndedAck {
  status: 'ended';
  mode_session_id: string;
}

// ─── WebSocket push payloads (result delivered asynchronously via WS) ─────────

/** Progress update — drives the "what's happening" panel in Learn mode. */
export interface WsStatusPush {
  type: 'status';
  stage: string;
  label: string;
}

/** Signals the start of a token-streamed text answer. */
export interface WsTextStreamStart {
  type: 'text_stream_start';
}

/** One token/word delta of a streaming text answer. */
export interface WsTextChunk {
  type: 'text_chunk';
  chunk: string;
}

/**
 * One passage the answer was grounded in.
 *
 * `citation` is the number the tutor writes in the answer as `[n]`.
 * `relevance` is a coarse band rather than a percentage — the underlying score
 * is a rank-fusion value and does not mean anything as a figure.
 */
export interface RetrievedSource {
  citation: number;
  id: string;
  text: string;
  /** Human-readable label, e.g. "calculus.pdf, p. 7 — Limits". */
  location: string;
  document_id: string | null;
  source_filename: string | null;
  section_title: string | null;
  heading_path: string[];
  page: number | null;
  page_end: number | null;
  has_math: boolean;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

/** A lecturer-approved concept animation, with a short-lived playback URL. */
export interface ConceptVideoAsset {
  id: string;
  concept_key: string;
  /** Signed URL — rendered-media is a private bucket. */
  url: string;
  duration_seconds?: number | null;
  renderer?: 'manim' | 'remotion';
  archetype?: string | null;
}

/** A student-submitted photo, re-signed for display on reload. */
export interface ConversationAttachment {
  /** Short-lived signed URL — student-uploads is a private bucket. */
  url: string;
  media_type?: string | null;
}

/** One stored turn, as returned by GET /sessions/{id}/conversations. */
export interface ConversationRow {
  id: string;
  mode: TutorMode;
  user_input: string;
  tutor_response: string;
  response_format: 'text' | 'video';
  video_url: string | null;
  audio_url: string | null;
  created_at: string;
  /** Absent on turns recorded before sources were persisted. */
  sources?: RetrievedSource[] | null;
  attachments?: ConversationAttachment[] | null;
}

export interface ConversationsResponse {
  session_id: string;
  conversations: ConversationRow[];
  limit: number;
  offset: number;
}

/**
 * The passages retrieval settled on, pushed *before* the first token so the
 * client can show what the answer is being drawn from while it is written.
 */
export interface WsSourcesPush {
  type: 'sources';
  sources: RetrievedSource[];
}

/** Terminal push for a Learn turn — carries the authoritative full answer. */
export interface WsResponseComplete {
  type: 'response_complete';
  mode: 'learn';
  response: string;
  response_format: 'text' | 'video';
  video_url: string | null;
  audio_url: string | null;
  subtitles_url?: string | null;
  /** Repeated here so a client that reconnected mid-turn still gets them. */
  sources?: RetrievedSource[];
  // Present when the answer is delivered via the real-time D-ID avatar stream
  // (source "did_agent", streaming true) rather than a rendered MP4 clip.
  source?: string;
  streaming?: boolean;
}

export interface WsLearnResponse {
  mode: 'learn';
  response: string;
  response_format: 'text' | 'video';
  video_url: string | null;
  audio_url: string | null;
  subtitles_url?: string | null;
}

export interface WsModeSessionStartPush {
  mode_session_id: string;
  mode: 'application' | 'review';
  session_type: string;
  difficulty: string;
  prompt: string;
  response_format: 'text' | 'video';
  video_url?: string | null;
  audio_url?: string | null;
  subtitles_url?: string | null;
}

export interface WsModeSessionEvaluationPush {
  mode: 'application' | 'review';
  type: 'evaluation';
  evaluation: ApiApplicationEvaluation | ApiReviewEvaluation;
  next_prompt: string;
  next_difficulty?: string;
  response_format: 'text';
  // application mode can include delivery blocks for video
  delivery?: DeliveryBlock;
  next_delivery?: DeliveryBlock;
}

export interface WsModeSessionCompletedPush {
  mode: 'application' | 'review';
  type: 'completed';
  evaluation: ApiApplicationEvaluation | ApiReviewEvaluation;
  key_learning_points?: string[];
  summary?: string;
  response_format: 'text';
  key_delivery?: DeliveryBlock;
}

export type WsIncoming =
  | WsProcessingAck
  | WsEndedAck
  | WsStatusPush
  | WsTextStreamStart
  | WsTextChunk
  | WsSourcesPush
  | WsResponseComplete
  | WsLearnResponse
  | WsModeSessionStartPush
  | WsModeSessionEvaluationPush
  | WsModeSessionCompletedPush
  | { error: string }
  | { status: 'failed'; error: string };

// ─── Evaluation objects ───────────────────────────────────────────────────────

export interface ApiApplicationEvaluation {
  verdict: 'correct' | 'partially_correct' | 'incorrect';
  score: number;
  feedback: string;
  missing_points?: string[];
  unsupported_claims?: string[];
}

export interface ApiReviewEvaluation {
  verdict: 'correct' | 'partially_correct' | 'incorrect';
  score: number;
  rubric_level?: string;
  feedback: string;
  missing_points?: string[];
  unsupported_claims?: string[];
  correct_answer?: string;
}

// Kept for backward compat with chat.ts PracticeEvaluation references
export type ModeSessionTurnResponse = never; // No longer used — results arrive via WebSocket
export type ModeSessionStartResponse = WsProcessingAck; // start returns ack; prompt arrives via WS
