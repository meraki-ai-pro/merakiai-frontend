import { API_BASE_URL } from '@/lib/constants';
import { tokenStore } from '@/services/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// ─── Admin-specific types ─────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  avatar_id: string | null;
  avatar_gender: 'male' | 'female' | null;
  voice_id: string | null;
  created_at: string;
}

export interface AdminSession {
  id: string;
  user_id: string;
  user_email?: string;
  current_mode: 'learn' | 'application' | 'review';
  prefers_video: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface AdminDocument {
  id: string;
  filename: string;
  doc_type: string;
  default_mode: string;
  difficulty: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  user_id: string;
}

export interface AdminFeedbackSurvey {
  id: string;
  user_id: string;
  session_id: string;
  clarity_rating: number;
  helpfulness_rating: number;
  confidence_rating: number;
  overall_rating: number;
  created_at: string;
}

export interface AdminUserFeedback {
  id: string;
  user_id: string;
  session_id: string | null;
  feedback_type: 'bug' | 'suggestion' | 'content' | 'ux' | 'other';
  message: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_sessions: number;
  total_documents: number;
  active_sessions_today: number;
  feedback_count: number;
  avg_overall_rating: number;
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
      // Guard: if the caller expects an array (T extends any[]) but the backend
      // returned an object (e.g. a 404 detail or an unimplemented endpoint), 
      // return an empty array so .map()/.filter() never throws.
      const data = Array.isArray(raw) ? raw : (typeof raw === 'object' && raw !== null && 'data' in raw ? raw.data : raw);
      return { success: true, data: data as T };
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

  // ─── Users (admin) ───────────────────────────────────────────────────────
  // Uses Supabase directly via the app's existing user table
  getUsers() {
    return this.request<AdminUser[]>('/admin/users');
  }

  getUserById(userId: string) {
    return this.request<AdminUser>(`/admin/users/${userId}`);
  }

  // ─── Sessions (admin) ────────────────────────────────────────────────────
  getAllSessions(limit = 50, offset = 0) {
    return this.request<AdminSession[]>(`/admin/sessions?limit=${limit}&offset=${offset}`);
  }

  // ─── Documents (admin uses existing ingestion endpoint) ──────────────────
  getAllDocuments() {
    return this.request<AdminDocument[]>('/admin/documents');
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

  // ─── Feedback (admin) ────────────────────────────────────────────────────
  getAllSessionSurveys() {
    return this.request<AdminFeedbackSurvey[]>('/admin/feedback/surveys');
  }

  getAllUserFeedback() {
    return this.request<AdminUserFeedback[]>('/admin/feedback/user');
  }

  // ─── Stats ───────────────────────────────────────────────────────────────
  getStats() {
    return this.request<AdminStats>('/admin/stats');
  }
}

export const adminApiClient = new AdminApiClient(API_BASE_URL);
