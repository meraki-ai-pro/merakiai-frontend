import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import { debugBackend } from '@/lib/debug';
import type {
  ApiResponse,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  SessionDetailsResponse,
  SessionModeUpdateRequest,
  SessionModeUpdateResponse,
  VideoToggleRequest,
  VideoToggleResponse,
  EndSessionResponse,
  UserProfileResponse,
  AvatarSelectRequest,
  AvatarSelectResponse,
  SessionSurveyRequest,
  UserFeedbackRequest,
  FeedbackResponse,
  TaskStatusResponse,
} from '@/types';

// ─── Cookie-based token store (accessible by middleware) ─────────────────────
const COOKIE_NAME = 'meraki_token';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export const tokenStore = {
  get: (): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    return match ? decodeURIComponent(match.split('=')[1]) : null;
  },

  set: (token: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = [
      `${COOKIE_NAME}=${encodeURIComponent(token)}`,
      `Max-Age=${COOKIE_MAX_AGE}`,
      'Path=/',
      'SameSite=Lax',
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  },

  clear: () => {
    if (typeof document === 'undefined') return;
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  },
};

// ─── API Client ───────────────────────────────────────────────────────────────
class ApiClient {
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
    options?: RequestInit & { skipAuth?: boolean }
  ): Promise<ApiResponse<T>> {
    try {
      const hasBody = options?.body !== undefined && options.body !== null;

      const headers: Record<string, string> = {
        ...(hasBody && !(options?.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(options?.skipAuth ? {} : this.authHeaders()),
        ...(options?.headers as Record<string, string>),
      };

      const url = endpoint.startsWith('/api/') ? endpoint : `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errBody = await response.json();
          if (!endpoint.startsWith('/auth')) {
            debugBackend(`api:error:${options?.method ?? 'GET'} ${endpoint}`, errBody);
          }
          if (Array.isArray(errBody?.detail)) {
            message = errBody.detail
              .map((e: { msg?: string; loc?: string[] }) =>
                e.loc ? `${e.loc.join(' → ')}: ${e.msg}` : (e.msg ?? JSON.stringify(e))
              )
              .join('; ');
          } else if (typeof errBody?.detail === 'string') {
            message = errBody.detail;
          }
        } catch {
          /* ignore parse errors */
        }
        return { success: false, error: { code: String(response.status), message } };
      }

      const data: T = await response.json();
      if (!endpoint.startsWith('/auth')) {
        debugBackend(`api:response:${options?.method ?? 'GET'} ${endpoint}`, data);
      }
      return { success: true, data };
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

  // ─── Health ───────────────────────────────────────────────────────────────
  healthCheck() {
    return this.request<{ status: string }>(API_ENDPOINTS.HEALTH, { skipAuth: true });
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const res = await this.request<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    if (res.success && res.data?.access_token) {
      tokenStore.set(res.data.access_token);
    }
    return res;
  }

  async signup(payload: SignupRequest) {
    return this.request<SignupResponse>(API_ENDPOINTS.AUTH_SIGNUP, {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  }

  async forgotPassword(email: string, redirectTo?: string) {
    return this.request<{ status: string; message: string }>(
      API_ENDPOINTS.AUTH_FORGOT_PASSWORD,
      {
        method: 'POST',
        body: JSON.stringify({ email, redirect_to: redirectTo }),
        skipAuth: true,
      }
    );
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ status: string; message: string }>(
      API_ENDPOINTS.AUTH_RESET_PASSWORD,
      {
        method: 'POST',
        body: JSON.stringify({ token, password: newPassword }),
        skipAuth: true,
      }
    );
  }

  logout() {
    tokenStore.clear();
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  /**
   * GET /sessions/courses — list available courses.
   * Call this before createSession to get a valid course_id.
   */
  listCourses() {
    return this.request<{ courses: { id: string; name: string; description: string }[] }>(
      API_ENDPOINTS.SESSIONS_COURSES
    );
  }

  /**
   * POST /sessions/ — create a new session.
   * Requires course_id. The backend will 404 if the course doesn't exist.
   */
  createSession(payload: CreateSessionRequest) {
    return this.request<CreateSessionResponse>(API_ENDPOINTS.SESSIONS_CREATE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getSession(sessionId: string) {
    return this.request<SessionDetailsResponse>(API_ENDPOINTS.SESSIONS_GET(sessionId));
  }

  /**
   * PATCH /sessions/{id}/mode
   * Backend accepts: 'learn' | 'application' | 'review'
   * NOTE: 'practice' is NOT a valid value — use 'application'.
   */
  switchSessionMode(sessionId: string, mode: 'learn' | 'application' | 'review') {
    return this.request<SessionModeUpdateResponse>(API_ENDPOINTS.SESSIONS_MODE(sessionId), {
      method: 'PATCH',
      body: JSON.stringify({ current_mode: mode } as SessionModeUpdateRequest),
    });
  }

  setVideoPreference(sessionId: string, prefersVideo: boolean) {
    return this.request<VideoToggleResponse>(API_ENDPOINTS.SESSIONS_VIDEO(sessionId), {
      method: 'PATCH',
      body: JSON.stringify({ prefers_video: prefersVideo } as VideoToggleRequest),
    });
  }

  endSession(sessionId: string) {
    return this.request<EndSessionResponse>(API_ENDPOINTS.SESSIONS_END(sessionId), {
      method: 'POST',
    });
  }

  getConversations(sessionId: string, limit = 50, offset = 0) {
    return this.request<{ conversations: object[] }>(
      `${API_ENDPOINTS.SESSIONS_CONVERSATIONS(sessionId)}?limit=${limit}&offset=${offset}`
    );
  }

  getRagTaskStatus(taskId: string) {
    return this.request<TaskStatusResponse>(`/api/backend${API_ENDPOINTS.RAG_STATUS(taskId)}`);
  }

  getModeSessionTaskStatus(taskId: string) {
    return this.request<TaskStatusResponse>(`/api/backend${API_ENDPOINTS.MODE_SESSIONS_STATUS(taskId)}`);
  }

  // ─── Voice (REST, result arrives via WebSocket) ───────────────────────────

  /**
   * POST /rag/turn/voice — voice input for Learn mode.
   * The transcript is returned immediately; the AI response is pushed via WebSocket.
   */
  async uploadVoice(sessionId: string, audioBlob: Blob) {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', audioBlob, 'recording.webm');
    return this.request<{ task_id: string; transcript: string; status: string }>(
      API_ENDPOINTS.RAG_TURN_VOICE,
      { method: 'POST', body: formData }
    );
  }

  /**
   * POST /mode-sessions/{id}/turn/voice — voice input for Application/Review.
   * The transcript is returned immediately; the AI evaluation is pushed via WebSocket.
   */
  async uploadModeVoice(modeSessionId: string, audioBlob: Blob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    return this.request<{ task_id: string; transcript: string; status: string }>(
      API_ENDPOINTS.MODE_SESSIONS_TURN_VOICE(modeSessionId),
      { method: 'POST', body: formData }
    );
  }

  // ─── User Profile ─────────────────────────────────────────────────────────
  getUserProfile() {
    return this.request<UserProfileResponse>(API_ENDPOINTS.USERS_ME);
  }

  selectAvatar(avatarId: string) {
    return this.request<AvatarSelectResponse>(API_ENDPOINTS.USERS_AVATAR, {
      method: 'POST',
      body: JSON.stringify({ avatar_id: avatarId } as AvatarSelectRequest),
    });
  }

  updateAvatar(avatarId: string) {
    return this.request<AvatarSelectResponse>(API_ENDPOINTS.USERS_AVATAR_UPDATE, {
      method: 'PATCH',
      body: JSON.stringify({ avatar_id: avatarId } as AvatarSelectRequest),
    });
  }

  // ─── Feedback ─────────────────────────────────────────────────────────────
  submitSessionSurvey(payload: SessionSurveyRequest) {
    return this.request<FeedbackResponse>(API_ENDPOINTS.FEEDBACK_SESSION_SURVEY, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  submitUserFeedback(payload: UserFeedbackRequest) {
    return this.request<FeedbackResponse>(API_ENDPOINTS.FEEDBACK_USER, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
