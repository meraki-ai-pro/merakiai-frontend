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
  LecturerCourse,
  LecturerCourseCreate,
  RenderAsset,
  RenderRequestBody,
  LecturerVoice,
  RenderRegenerateBody,
  RosterImportResult,
  EnrolmentInvitation,
  CourseMastery,
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
  UpdateProfileRequest,
  ChangePasswordRequest,
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

  listLecturerCourses() {
    return this.request<{ courses: LecturerCourse[] }>('/lecturer/courses');
  }

  createLecturerCourse(body: LecturerCourseCreate) {
    return this.request<{ course: LecturerCourse }>('/lecturer/courses', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getLecturerCourse(courseId: string) {
    return this.request<{ course: LecturerCourse }>(`/lecturer/courses/${courseId}`);
  }

  updateLecturerCourse(courseId: string, body: Partial<LecturerCourseCreate>) {
    return this.request<{ course: LecturerCourse }>(`/lecturer/courses/${courseId}`, {
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
      // 'basic', not 'beginner' — documents_difficulty_check allows exactly
      // basic|intermediate|advanced, and 'beginner' 500'd every upload that
      // did not name a difficulty until the server started translating it.
      difficulty: opts.difficulty ?? 'basic',
      version: opts.version ?? '1',
      is_published: String(opts.isPublished ?? false),
    });
    if (opts.targetModes?.length) params.set('target_modes', opts.targetModes.join(','));
    if (opts.topic) params.set('topic', opts.topic);
    // Review material only. The API rejects formats on a file not tagged for
    // Review rather than storing a tag that can never apply.
    if (opts.questionFormats?.length)
      params.set('question_formats', opts.questionFormats.join(','));

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

  /**
   * POST .../students/import — enrol a whole class from a spreadsheet.
   *
   * Rows whose address has no account yet come back under `invited`, NOT
   * `enrolled`: they become enrolments when that person signs up. Surfacing
   * the two separately is the difference between an import that looks like it
   * did nothing and one the lecturer can trust.
   */
  importCourseStudents(courseId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.request<RosterImportResult>(
      `/lecturer/courses/${courseId}/students/import`,
      { method: 'POST', body: form }
    );
  }

  listEnrolmentInvitations(courseId: string) {
    return this.request<{ invitations: EnrolmentInvitation[]; available?: boolean }>(
      `/lecturer/courses/${courseId}/students/invitations`
    );
  }

  cancelEnrolmentInvitation(courseId: string, invitationId: string) {
    return this.request<{ invitation_id: string }>(
      `/lecturer/courses/${courseId}/students/invitations/${invitationId}`,
      { method: 'DELETE' }
    );
  }

  changeEnrolmentStatus(courseId: string, enrolmentId: string, status: string) {
    return this.request<{ new_status: string }>(
      `/lecturer/courses/${courseId}/students/${enrolmentId}`,
      { method: 'PATCH', body: JSON.stringify({ status }) }
    );
  }

  // ─── Lecturer voices ──────────────────────────────────────────────────
  //
  // A voice belongs to the LECTURER and is attached to any of their courses,
  // so recording once serves every course they teach.

  listLecturerVoices() {
    return this.request<{ voices: LecturerVoice[]; available?: boolean }>(
      '/lecturer/voices'
    );
  }

  /** Clone a voice from a browser recording. `seconds` is what the client
   *  measured — the server uses it to refuse samples too short to clone well. */
  createLecturerVoice(recording: Blob, name: string, seconds: number) {
    const form = new FormData();
    // Named so the server sees a sensible filename; MediaRecorder blobs have none.
    form.append('sample', recording, 'recording.webm');
    form.append('name', name);
    form.append('seconds', String(Math.round(seconds)));
    return this.request<{ voice: LecturerVoice }>('/lecturer/voices', {
      method: 'POST',
      body: form,
    });
  }

  /** Returns an object URL for the preview audio, or null. Caller revokes it. */
  async previewLecturerVoice(voiceId: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/lecturer/voices/${voiceId}/preview`, {
        method: 'POST',
        headers: this.authHeaders(),
      });
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    } catch {
      return null;
    }
  }

  renameLecturerVoice(voiceId: string, name: string) {
    return this.request<{ voice_id: string }>(`/lecturer/voices/${voiceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  }

  deleteLecturerVoice(voiceId: string) {
    return this.request<{ voice_id: string }>(`/lecturer/voices/${voiceId}`, {
      method: 'DELETE',
    });
  }

  /** Attach a voice to one course, or pass null to use the default narrator. */
  setCourseVoice(courseId: string, voiceId: string | null) {
    return this.request<{ course_id: string; voice_id: string | null }>(
      `/lecturer/courses/${courseId}/voice`,
      { method: 'PUT', body: JSON.stringify({ voice_id: voiceId }) }
    );
  }

  /**
   * POST /narration/board — audio for one lesson-board slide, in the course's
   * voice. Cached server-side by voice + text, so a cohort synthesises each
   * slide once.
   */
  narrateBoardSlide(courseId: string, text: string) {
    return this.request<{ url?: string; cached?: boolean }>('/narration/board', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, text }),
    });
  }

  getCourseAnalytics(courseId: string) {
    return this.request<CourseAnalytics>(`/lecturer/courses/${courseId}/analytics`);
  }

  /** Per-topic and per-student mastery — who needs help with what. */
  getCourseMastery(courseId: string) {
    return this.request<CourseMastery>(
      `/lecturer/courses/${courseId}/analytics/mastery`
    );
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

  /**
   * POST /render/{id}/regenerate — re-render a concept from an edited prompt.
   *
   * Creates a NEW asset. The video students currently see keeps serving until
   * the revision is approved, so a bad regeneration never leaves the course
   * with nothing for the minutes a re-render takes.
   */
  regenerateRenderAsset(assetId: string, body: RenderRegenerateBody) {
    return this.request<{ status: string; asset: RenderAsset; replaces: string }>(
      `/render/${assetId}/regenerate`,
      { method: 'POST', body: JSON.stringify(body) }
    );
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

  /**
   * PATCH /users/me — edit your own profile.
   *
   * One endpoint for students, lecturers and admins. Three role-specific
   * copies would be three places for a field to be missing from one.
   */
  updateProfile(body: UpdateProfileRequest) {
    return this.request<{ status: string; profile: UserProfileResponse }>(
      API_ENDPOINTS.USERS_ME,
      { method: 'PATCH', body: JSON.stringify(body) }
    );
  }

  /**
   * POST /auth/update-password.
   *
   * The current password is required by the API, not just by the form: without
   * it a stolen access token is enough to take an account over permanently.
   */
  changePassword(body: ChangePasswordRequest) {
    return this.request<{ status: string }>(API_ENDPOINTS.AUTH_UPDATE_PASSWORD, {
      method: 'POST',
      body: JSON.stringify(body),
    });
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
