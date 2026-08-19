/**
 * Pre/post assessment shapes — mirrors app/api/v1/assessments.py.
 *
 * Note what is deliberately absent: `correct_answer` never appears on any
 * student-facing type, because the API never sends it. Scoring happens
 * server-side and the submit response carries a total only, with no
 * per-question breakdown — returning which items were wrong on a pre-test
 * would hand back the answer key before the post-test.
 */

export type AssessmentKind = 'pre' | 'post' | 'retention';

export interface Assessment {
  id: string;
  kind: AssessmentKind;
  title: string;
  instructions?: string | null;
  is_published?: boolean;
  created_at?: string;
}

/** As offered to a student: whether they have already sat it. */
export interface AvailableAssessment {
  id: string;
  kind: AssessmentKind;
  title: string;
  instructions?: string | null;
  completed: boolean;
}

export interface AssessmentQuestion {
  id: string;
  order_index: number;
  prompt: string;
  options: string[];
  topic?: string | null;
  points: number;
}

export interface TakeAssessmentResponse {
  assessment: Pick<Assessment, 'id' | 'kind' | 'title' | 'instructions'>;
  questions: AssessmentQuestion[];
}

export interface QuestionCreate {
  prompt: string;
  options: string[];
  correct_answer: string;
  topic?: string | null;
  points?: number;
  order_index?: number;
}

export interface SubmissionItem {
  question_id: string;
  answer: string;
  time_spent_seconds?: number | null;
}

export interface SubmitAssessmentResponse {
  status: 'ok';
  score: number;
  total: number;
  percent: number;
  answered: number;
}

export interface MasteryTopic {
  topic: string;
  attempts?: number;
  correct?: number;
  mastery?: number;
  [key: string]: unknown;
}
