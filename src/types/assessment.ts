/**
 * Exam and pre/post shapes — mirrors app/api/v1/assessments.py.
 *
 * `correct_answer` appears only on lecturer types and on a RELEASED result:
 * the API never sends the key to a student before the lecturer releases marks.
 */

/** Pre/post/retention are retired from the student view; kept to read old papers. */
export type AssessmentKind = 'pre' | 'post' | 'retention' | 'quiz' | 'test' | 'midsem' | 'final';
export type ExamKind = 'quiz' | 'test' | 'midsem' | 'final';
export type QuestionType = 'mcq' | 'fill_blank' | 'short_answer';

export const EXAM_KIND_LABELS: Record<AssessmentKind, string> = {
  quiz: 'Quiz',
  test: 'Class test',
  midsem: 'Mid-semester exam',
  final: 'End-of-semester exam',
  pre: 'Pre-test (retired)',
  post: 'Post-test (retired)',
  retention: 'Retention test (retired)',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  fill_blank: 'Fill in the blank',
  short_answer: 'Short answer',
};

export interface Assessment {
  id: string;
  kind: AssessmentKind;
  title: string;
  instructions?: string | null;
  is_published?: boolean;
  created_at?: string;
  time_limit_minutes?: number | null;
  opens_at?: string | null;
  closes_at?: string | null;
  results_released?: boolean;
  question_count?: number;
  /** Set by the Intervention Studio: only these students see the paper. */
  target_student_ids?: string[] | null;
}

/** As offered to a student. */
export interface AvailableAssessment {
  id: string;
  kind: AssessmentKind;
  title: string;
  instructions?: string | null;
  question_count: number;
  time_limit_minutes?: number | null;
  /** The limit with this student's extra-time accommodation applied. */
  your_time_minutes?: number | null;
  opens_at?: string | null;
  closes_at?: string | null;
  completed: boolean;
  results_released: boolean;
}

export interface AssessmentQuestion {
  id: string;
  order_index: number;
  prompt: string;
  options: string[];
  topic?: string | null;
  points: number;
  question_type?: QuestionType;
}

/** Lecturer view of a question: with the key. */
export interface LecturerQuestion extends AssessmentQuestion {
  correct_answer: string;
}

export interface TakeAssessmentResponse {
  assessment: Pick<Assessment, 'id' | 'kind' | 'title' | 'instructions' | 'time_limit_minutes'>;
  questions: AssessmentQuestion[];
  deadline: string | null;
  server_now: string;
}

export interface QuestionCreate {
  question_type?: QuestionType;
  prompt: string;
  options: string[];
  correct_answer: string;
  topic?: string | null;
  points?: number;
  order_index?: number;
}

/** A question read from an uploaded paper, awaiting the lecturer's review. */
export interface ImportedQuestion extends QuestionCreate {
  question_type: QuestionType;
  /** 'inferred' / 'missing' answers must be checked before saving. */
  answer_source: 'paper' | 'inferred' | 'missing';
}

export interface SubmissionItem {
  question_id: string;
  answer: string;
  time_spent_seconds?: number | null;
}

export type SubmitAssessmentResponse =
  | { status: 'submitted'; answered: number; released: false }
  | { status: 'ok'; score: number; total: number; percent: number; answered: number };

export interface MyResult {
  released: boolean;
  title?: string;
  score?: number;
  total?: number;
  percent?: number;
  items?: {
    prompt: string;
    question_type: QuestionType;
    options: string[];
    points: number;
    your_answer: string | null;
    score: number;
    correct_answer: string;
    feedback: string | null;
  }[];
}

export interface ExamResults {
  results_released: boolean;
  total_points: number;
  responses: number;
  pending_review: number;
  students: {
    student_id: string;
    name: string | null;
    email: string | null;
    score: number;
    percent: number;
    pending_review: number;
  }[];
}

export interface MarkingItem {
  attempt_id: string;
  student: string | null;
  question_id: string;
  question: string;
  model_answer: string;
  points: number;
  answer: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
  score: number;
  needs_review: boolean;
}

export interface Accommodation {
  student_id: string;
  name: string | null;
  email: string | null;
  extra_time_percent: number;
}

export interface MasteryTopic {
  topic: string;
  attempts?: number;
  correct?: number;
  mastery?: number;
  [key: string]: unknown;
}
