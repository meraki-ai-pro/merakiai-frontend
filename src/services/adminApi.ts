import { API_BASE_URL } from '@/lib/constants';
import { tokenStore } from '@/services/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// ─── Admin-specific types (match the live backend under /admin/*) ──────────────

export interface AdminUser {
  id: string;
  email: string;
  role: string; // 'admin' | 'user' | 'super_admin'
  first_name: string | null;
  last_name: string | null;
  university_name: string | null;
  country: string | null;
  created_at: string;
}

/**
 * Who may hand out which role. Mirrors _ASSIGNABLE_BY in
 * app/api/v1/admin/users.py.
 *
 * Duplicated here ONLY to grey out controls the caller cannot use. The server
 * enforces it independently — a client-side check is a courtesy, never the
 * boundary, and hiding a button is not authorisation.
 */
export const ASSIGNABLE_ROLES: Record<string, readonly AdminRole[]> = {
  admin: ['user', 'lecturer'],
  super_admin: ['user', 'lecturer', 'admin', 'super_admin'],
};

export type AdminRole = 'user' | 'lecturer' | 'admin' | 'super_admin';

export const ROLE_LABELS: Record<AdminRole, string> = {
  user: 'Student',
  lecturer: 'Lecturer',
  admin: 'Admin',
  super_admin: 'Super admin',
};

/** One piece of feedback, with its author, from GET /admin/feedback. */
export interface AdminFeedbackItem {
  id: string;
  source: 'user_feedback' | 'session_survey' | 'feedback_suite';
  kind: string | null;
  message: string | null;
  ratings: Record<string, number | string | null> | null;
  structured_answers?: Record<string, unknown>;
  course_id: string | null;
  session_id: string | null;
  created_at: string;
  author: {
    name: string | null;
    email: string | null;
    /** Role AT SUBMISSION where it was recorded, not the account's role now. */
    role: string;
    current_role?: string | null;
    deleted: boolean;
  };
}

export interface AdminFeedbackPage {
  items: AdminFeedbackItem[];
  total: number;
  page: number;
  page_size: number;
  days: number;
  by_role: Record<string, number>;
  by_source: Record<string, number>;
  by_kind: Record<string, number>;
}

export interface AdminDocument {
  id: string;
  title: string;
  source_filename: string;
  doc_type: string;
  default_mode: string;
  difficulty: string;
  version: string;
  status: 'processing' | 'ready' | 'failed';
  total_chunks: number;
  course_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrendPoint {
  date: string;
  count: number;
}

// GET /admin/analytics/overview
export interface AdminOverview {
  total_users: number;
  active_users_30d: number;
  total_sessions: number;
  sessions_completed: number;
  total_conversations: number;
  total_reviews_completed: number;
  avg_overall_rating: number | null;
  avg_review_score: number | null;
  total_platform_minutes: number;
  survey_count: number;
  user_feedback_count: number;
  mode_feedback_count: number;
}

export interface ModeBreakdown {
  total: number;
  completed: number;
  completion_rate: number | null;
  avg_duration_min: number | null; // null when a mode has no completed sessions
  avg_messages: number | null;
}

// GET /admin/analytics/sessions
export interface AdminSessionAnalytics {
  total_sessions: number;
  by_mode: Record<string, number>;
  by_course: Record<string, number>;
  avg_session_duration_min: number;
  session_trend: TrendPoint[];
  mode_breakdown?: Record<string, ModeBreakdown>;
}

export interface RecentFeedbackItem {
  id: string;
  feedback_type: string;
  message: string;
  created_at: string;
}

// GET /admin/analytics/feedback
export interface AdminFeedbackAnalytics {
  session_surveys: {
    count: number;
    avg_clarity: number;
    avg_helpfulness: number;
    avg_confidence: number;
    avg_overall: number;
  };
  mode_feedback: Record<string, unknown>;
  user_feedback: {
    total: number;
    by_type: Record<string, number>;
    recent: RecentFeedbackItem[];
  };
  content_quality_flags?: unknown[];
}

// Paginated list envelopes returned by the backend
export interface Paginated<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

// ─── LLM config (GET/PATCH /admin/llm/config) ─────────────────────────────────
export interface LlmModeConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  output_config?: { effort?: string } & Record<string, unknown>;
}

export interface LlmConfigResponse {
  config: Record<string, LlmModeConfig>;
  defaults: Record<string, LlmModeConfig>;
  available_models: string[];
}

export interface LlmModeUpdate {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface LlmModeUsage {
  total_requests: number;
  text_requests: number;
  video_requests: number;
  avg_ai_ms: number | null;
  avg_video_ms: number | null;
  model_in_use: string;
}

export interface LlmUsageResponse {
  period_days: number;
  total_requests: number;
  by_mode: Record<string, LlmModeUsage>;
}

// ─── Media service API keys (GET/PATCH /admin/media/keys) ──────────────────────
export interface MediaKeyStatus {
  name: string;
  label: string;
  service: string;
  is_set: boolean;
  source: 'env' | 'override' | 'unset';
  masked: string | null;
}

export interface DocumentUploadRequest {
  doc_type: 'knowledge' | 'assessment';
  default_mode: 'learn' | 'application' | 'review';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  version?: string;
}

// ─── Admin API Client ─────────────────────────────────────────────────────────
class AdminApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private authHeaders(): Record<string, string> {
    const token = tokenStore.get();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.authHeaders(),
        ...(options?.headers as Record<string, string>),
      };

      if (options?.body instanceof FormData) {
        delete headers['Content-Type'];
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errBody = await response.json();
          message = errBody?.detail ?? message;
        } catch { /* ignore */ }
        return { success: false, error: { code: String(response.status), message } };
      }

      const raw = await response.json();
      return { success: true, data: raw as T };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // Unwrap a `{ <key>: T[], total, page, page_size }` envelope into Paginated<T>.
  private async paginated<T>(endpoint: string, key: string): Promise<ApiResponse<Paginated<T>>> {
    const res = await this.request<Record<string, unknown>>(endpoint);
    if (!res.success || !res.data) return { success: false, error: res.error };
    const raw = res.data;
    const items = Array.isArray(raw[key]) ? (raw[key] as T[]) : [];
    return {
      success: true,
      data: {
        items,
        total: typeof raw.total === 'number' ? raw.total : items.length,
        page: typeof raw.page === 'number' ? raw.page : 1,
        page_size: typeof raw.page_size === 'number' ? raw.page_size : items.length,
      },
    };
  }

  // ─── Overview / dashboard stats ──────────────────────────────────────────
  getOverview() {
    return this.request<AdminOverview>('/admin/analytics/overview');
  }

  // ─── Users ───────────────────────────────────────────────────────────────
  getUsers(opts: { page?: number; pageSize?: number; role?: string; search?: string } = {}) {
    const q = new URLSearchParams({
      page: String(opts.page ?? 1),
      page_size: String(Math.min(opts.pageSize ?? 100, 100)), // backend caps page_size at 100
    });
    if (opts.role) q.set('role', opts.role);
    if (opts.search) q.set('search', opts.search);
    return this.paginated<AdminUser>(`/admin/users?${q.toString()}`, 'users');
  }

  getUserById(userId: string) {
    return this.request<AdminUser>(`/admin/users/${userId}`);
  }

  /**
   * PATCH /admin/users/{id}/role.
   *
   * Granting or revoking admin is super-admin territory in BOTH directions —
   * letting an ordinary admin demote a super admin would be an escalation by
   * removal. The server decides; this just calls it.
   */
  updateUserRole(userId: string, role: AdminRole) {
    return this.request<{ status: string; user_id: string; new_role: string }>(
      `/admin/users/${userId}/role`,
      { method: 'PATCH', body: JSON.stringify({ role }) }
    );
  }

  // ─── Sessions (aggregate analytics — no per-session admin list exists) ─────
  getSessionAnalytics(days = 30) {
    return this.request<AdminSessionAnalytics>(`/admin/analytics/sessions?days=${days}`);
  }

  // ─── Documents ─────────────────────────────────────────────────────────────
  getDocuments(opts: { page?: number; pageSize?: number; status?: string; courseId?: string; docType?: string } = {}) {
    const q = new URLSearchParams({
      page: String(opts.page ?? 1),
      page_size: String(Math.min(opts.pageSize ?? 100, 100)), // backend caps page_size at 100
    });
    if (opts.status) q.set('status', opts.status);
    if (opts.courseId) q.set('course_id', opts.courseId);
    if (opts.docType) q.set('doc_type', opts.docType);
    return this.paginated<AdminDocument>(`/admin/documents?${q.toString()}`, 'documents');
  }

  uploadDocument(file: File, params: DocumentUploadRequest) {
    const formData = new FormData();
    formData.append('file', file);
    const query = new URLSearchParams({
      doc_type: params.doc_type,
      default_mode: params.default_mode,
      difficulty: params.difficulty,
      ...(params.version ? { version: params.version } : {}),
    }).toString();

    return this.request<{ document_id: string; status: string; message: string }>(
      `/ingestion/documents?${query}`,
      { method: 'POST', body: formData }
    );
  }

  // ─── Feedback ──────────────────────────────────────────────────────────────

  /** Averages and counts. Answers "how are we doing", not "who said this". */
  getFeedbackAnalytics(days = 90) {
    return this.request<AdminFeedbackAnalytics>(`/admin/analytics/feedback?days=${days}`);
  }

  /**
   * The submissions themselves, with their authors, across all three feedback
   * tables — including feedback_responses, which nothing on the admin side
   * used to read at all, so every NPS and mode survey was invisible.
   */
  getFeedbackInbox(
    opts: {
      days?: number;
      role?: string;
      source?: string;
      courseId?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const q = new URLSearchParams({
      days: String(opts.days ?? 90),
      page: String(opts.page ?? 1),
      page_size: String(Math.min(opts.pageSize ?? 50, 200)),
    });
    if (opts.role) q.set('role', opts.role);
    if (opts.source) q.set('source', opts.source);
    if (opts.courseId) q.set('course_id', opts.courseId);
    return this.request<AdminFeedbackPage>(`/admin/feedback?${q.toString()}`);
  }

  // ─── LLM configuration (Settings page) ─────────────────────────────────────
  getLlmConfig() {
    return this.request<LlmConfigResponse>('/admin/llm/config');
  }

  updateLlmMode(mode: string, payload: LlmModeUpdate) {
    return this.request<{ status: string; mode: string; config: LlmModeConfig }>(
      `/admin/llm/config/${mode}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
  }

  getLlmUsage(days = 30) {
    return this.request<LlmUsageResponse>(`/admin/llm/usage?days=${days}`);
  }

  // ─── Media service API keys (Video & Media page) ───────────────────────────
  getMediaKeys() {
    return this.request<{ keys: MediaKeyStatus[] }>('/admin/media/keys');
  }

  updateMediaKeys(updates: Record<string, string>) {
    return this.request<{ status: string; keys: MediaKeyStatus[] }>(
      '/admin/media/keys',
      { method: 'PATCH', body: JSON.stringify(updates) }
    );
  }
}

export const adminApiClient = new AdminApiClient(API_BASE_URL);
