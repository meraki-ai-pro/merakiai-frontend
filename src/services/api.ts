import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';
import { debugBackend } from '@/lib/debug';
import type {
  AcademicLevelOption,
  ApiResponse,
  Assessment,
  AssessmentKind,
  AssessmentQuestion,
  AvailableAssessment,
  MasteryTopic,
  QuestionCreate,
  SubmissionItem,
  SubmitAssessmentResponse,
  TakeAssessmentResponse,
  ConceptVideoAsset,
  ConversationsResponse,
  CourseAnalytics,
  CourseStudent,
  Enrolment,
  InviteCode,
  KnowledgeFile,
  KnowledgePatch,
  KnowledgeUploadOptions,
  InstructorCourse,
  InstructorCourseCreate,
  RenderAsset,
  RenderRequestBody,
  TestQueryResponse,
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
  UserSessionsResponse,
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

  async resetPassword(accessToken: string, newPassword: string) {
    return this.request<{ status: string; message: string }>(
      API_ENDPOINTS.AUTH_RESET_PASSWORD,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ new_password: newPassword }),
        skipAuth: true,
      }
    );
  }

  logout() {
    tokenStore.clear();
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  /** GET /sessions/ — list the authenticated user's sessions. */
  listUserSessions(limit = 50, offset = 0) {
    return this.request<UserSessionsResponse>(
      `${API_ENDPOINTS.SESSIONS_CREATE}?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * GET /sessions/courses — list available courses.
   * Call this before createSession to get a valid course_id.
   */
  listCourses() {
    return this.request<{ courses: { id: string; name: string; description: string }[] }>(
      API_ENDPOINTS.SESSIONS_COURSES
    );
  }

  // ─── Enrolment (student side) ─────────────────────────────────────────────

  /**
   * GET /enrolments — the courses this student is actually on.
   *
   * Distinct from listCourses(): that returns everything the catalogue offers,
   * while session creation is gated on enrolment. Picking a course from the
   * catalogue that the student is not enrolled on yields a 403.
   */
  listMyEnrolments() {
    return this.request<{ enrolments: Enrolment[] }>('/enrolments');
  }

  /** POST /enrolments/join — redeem an invite code read out in class. */
  joinCourseByCode(code: string) {
    return this.request<{ status: string; enrolment: Enrolment }>('/enrolments/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
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

  // ─── Lecturer ────────────────────────────────────────────────────────────
  // Every one of these is ownership-checked server-side; the UI showing a
  // course is never what authorises access to it.

  /** The level vocabulary, served so the dropdown cannot drift from the
   *  CHECK constraint or the teaching prompts. */
  listAcademicLevels() {
    return this.request<{ levels: AcademicLevelOption[] }>(
      '/lecturer/courses/academic-levels'
    );
  }

  listInstructorCourses() {
    return this.request<{ courses: InstructorCourse[] }>('/lecturer/courses');
  }

  createInstructorCourse(body: InstructorCourseCreate) {
    return this.request<{ course: InstructorCourse }>('/lecturer/courses', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getInstructorCourse(courseId: string) {
    return this.request<{ course: InstructorCourse }>(`/lecturer/courses/${courseId}`);
  }

  updateInstructorCourse(courseId: string, body: Partial<InstructorCourseCreate>) {
    return this.request<{ course: InstructorCourse }>(`/lecturer/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  listKnowledge(courseId: string) {
    return this.request<{ documents: KnowledgeFile[] }>(
      `/lecturer/courses/${courseId}/knowledge`
    );
  }

  /** Uploads land as DRAFT — publish only after a test query looks right. */
  uploadKnowledge(courseId: string, file: File, opts: KnowledgeUploadOptions = {}) {
    const params = new URLSearchParams({
      doc_type: opts.docType ?? 'knowledge',
      default_mode: opts.defaultMode ?? 'learn',
      difficulty: opts.difficulty ?? 'beginner',
      version: opts.version ?? '1',
      is_published: String(opts.isPublished ?? false),
    });
    if (opts.targetModes?.length) params.set('target_modes', opts.targetModes.join(','));
    if (opts.topic) params.set('topic', opts.topic);

    const form = new FormData();
    form.append('file', file);
    return this.request<{ document_id: string; status: string }>(
      `/lecturer/courses/${courseId}/knowledge?${params.toString()}`,
      { method: 'POST', body: form }
    );
  }

  updateKnowledge(courseId: string, documentId: string, body: KnowledgePatch) {
    return this.request<{ document_id: string }>(
      `/lecturer/courses/${courseId}/knowledge/${documentId}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    );
  }

  deleteKnowledge(courseId: string, documentId: string) {
    return this.request<{ document_id: string }>(
      `/lecturer/courses/${courseId}/knowledge/${documentId}`,
      { method: 'DELETE' }
    );
  }

  /** Retrieval only, no generated answer — a fluent answer over bad retrieval
   *  is exactly what hides a problem before publishing. */
  testKnowledgeQuery(courseId: string, question: string, mode = 'learn') {
    return this.request<TestQueryResponse>(
      `/lecturer/courses/${courseId}/knowledge/test-query`,
      { method: 'POST', body: JSON.stringify({ question, mode }) }
    );
  }

  listInviteCodes(courseId: string) {
    return this.request<{ invite_codes: InviteCode[] }>(
      `/lecturer/courses/${courseId}/invite-codes`
    );
  }

  createInviteCode(courseId: string, maxUses?: number, expiresAt?: string) {
    return this.request<{ invite_code: InviteCode }>(
      `/lecturer/courses/${courseId}/invite-codes`,
      { method: 'POST', body: JSON.stringify({ max_uses: maxUses ?? null, expires_at: expiresAt ?? null }) }
    );
  }

  deactivateInviteCode(courseId: string, codeId: string) {
    return this.request<{ code_id: string }>(
      `/lecturer/courses/${courseId}/invite-codes/${codeId}`,
      { method: 'DELETE' }
    );
  }

  listCourseStudents(courseId: string, status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<{ students: CourseStudent[] }>(
      `/lecturer/courses/${courseId}/students${q}`
    );
  }

  addCourseStudent(courseId: string, email: string) {
    return this.request<{ enrolment_id: string }>(
      `/lecturer/courses/${courseId}/students`,
      { method: 'POST', body: JSON.stringify({ email }) }
    );
  }

  changeEnrolmentStatus(courseId: string, enrolmentId: string, status: string) {
    return this.request<{ new_status: string }>(
      `/lecturer/courses/${courseId}/students/${enrolmentId}`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    );
  }

  getCourseAnalytics(courseId: string) {
    return this.request<CourseAnalytics>(`/lecturer/courses/${courseId}/analytics`);
  }

  /** GET /render/archetypes — visual styles, and which renderer each routes to. */
  listRenderArchetypes() {
    return this.request<{ archetypes: { name: string; renderer: string }[]; unsupported: string[] }>(
      '/render/archetypes'
    );
  }

  listRenderAssets(courseId: string) {
    return this.request<{ assets: RenderAsset[] }>(`/render/course/${courseId}`);
  }

  getRenderAsset(assetId: string) {
    return this.request<{ asset: RenderAsset; preview_url: string | null }>(
      `/render/${assetId}`
    );
  }

  reviewRenderAsset(assetId: string, approved: boolean, note?: string) {
    return this.request<{ approved: boolean }>(`/render/${assetId}/review`, {
      method: 'POST',
      body: JSON.stringify({ approved, note: note ?? null }),
    });
  }

  requestRender(body: RenderRequestBody) {
    return this.request<{ status: string; asset: RenderAsset }>('/render', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * GET /render/concept/{course}/{key} — the approved animation for a concept.
   * `asset` is null when nothing has been rendered and approved, which is the
   * normal case, not an error.
   */
  getConceptVideo(courseId: string, conceptKey: string) {
    return this.request<{ asset: ConceptVideoAsset | null }>(
      `/render/concept/${encodeURIComponent(courseId)}/${encodeURIComponent(conceptKey)}`
    );
  }

  getConversations(sessionId: string, limit = 50, offset = 0) {
    return this.request<ConversationsResponse>(
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

  async transcribeVoice(audioBlob: Blob) {
    const formData = new FormData();
    const extension = audioBlob.type.includes('mp4') ? 'm4a'
      : audioBlob.type.includes('ogg') ? 'ogg'
      : audioBlob.type.includes('wav') ? 'wav'
      : 'webm';
    formData.append('file', audioBlob, `recording.${extension}`);
    return this.request<{ transcript: string }>(
      API_ENDPOINTS.RAG_TRANSCRIBE,
      { method: 'POST', body: formData }
    );
  }

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

  // ─── Assessments ──────────────────────────────────────────────────────────

  /** POST /assessments — lecturer creates a pre/post/retention paper. */
  createAssessment(payload: {
    course_id: string;
    kind: AssessmentKind;
    title: string;
    instructions?: string | null;
  }) {
    return this.request<{ status: string; assessment: Assessment }>('/assessments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  listAssessments(courseId: string) {
    return this.request<{ assessments: Assessment[] }>(`/assessments/course/${courseId}`);
  }

  addAssessmentQuestion(assessmentId: string, payload: QuestionCreate) {
    return this.request<{ status: string; question: AssessmentQuestion | null }>(
      `/assessments/${assessmentId}/questions`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  publishAssessment(assessmentId: string) {
    return this.request<{ status: string; assessment_id: string; questions: number }>(
      `/assessments/${assessmentId}/publish`,
      { method: 'PATCH' }
    );
  }

  getAssessmentResults(assessmentId: string) {
    return this.request<Record<string, unknown>>(`/assessments/${assessmentId}/results`);
  }

  getLearningGain(courseId: string) {
    return this.request<Record<string, unknown>>(
      `/assessments/course/${courseId}/learning-gain`
    );
  }

  /** GET /assessments/available/{course} — what this student may sit. */
  listAvailableAssessments(courseId: string) {
    return this.request<{ assessments: AvailableAssessment[] }>(
      `/assessments/available/${courseId}`
    );
  }

  /** GET /assessments/{id}/take — questions with the answer key withheld. */
  takeAssessment(assessmentId: string) {
    return this.request<TakeAssessmentResponse>(`/assessments/${assessmentId}/take`);
  }

  submitAssessment(assessmentId: string, answers: SubmissionItem[]) {
    return this.request<SubmitAssessmentResponse>(`/assessments/${assessmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  getMyMastery(courseId: string) {
    return this.request<{ topics: MasteryTopic[] }>(`/assessments/mastery/${courseId}`);
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
