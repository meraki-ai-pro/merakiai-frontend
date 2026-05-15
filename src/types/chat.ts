export type TutorMode = 'learn' | 'application' | 'review';
export type ResponseFormat = 'text' | 'video';

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  responseFormat?: ResponseFormat;
  videoUrl?: string | null;
  audioUrl?: string | null;
  mode: TutorMode;
  timestamp: Date;

  evaluation?: PracticeEvaluation | ReviewEvaluation | null;
  messageType?: 'prompt' | 'evaluation' | 'completed';
  keyLearningPoints?: string[];
  nextDifficulty?: string;
  step?: number;
  totalSteps?: number;

  // ── Completion summary fields ──────────────────────────────────────────────
  // Overall score (0–100) across all steps/questions in the session
  finalScore?: number;
  // Per-step breakdown: each entry is { step, score (0-100), verdict }
  scoreBreakdown?: ScoreEntry[];
}

export interface ScoreEntry {
  step: number;
  score: number;   // 0–100
  verdict: 'correct' | 'partial' | 'incorrect' | 'partially_correct';
}

export interface PracticeEvaluation {
  verdict: 'correct' | 'partial' | 'incorrect';
  score: number;
  feedback: string;
  missing_points: string[];
  unsupported_claims: string[];
}

export interface ReviewEvaluation {
  verdict: 'correct' | 'partial' | 'incorrect';
  score: number;
  rubric_level: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory';
  feedback: string;
  missing_points: string[];
  unsupported_claims: string[];
  correct_answer?: string;
}

export interface Session {
  id: string;
  title: string;
  mode: TutorMode;
  currentMode?: TutorMode;
  prefersVideo: boolean;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  previewMessage?: string;
  startedAt?: string;
  endedAt?: string | null;
  courseId?: string;
}

export interface VideoResponse {
  videoUrl: string;
  audioUrl?: string;
  duration: number;
  subtitles: Subtitle[];
}

export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface ActiveModeSession {
  modeSessionId: string;
  mode: 'application' | 'review';
  sessionType: string;
  difficulty: string;
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  // Running list of per-step scores (0–1 from backend, stored as 0–100)
  scores: number[];
}