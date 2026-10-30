import { apiClient } from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import { useCourseStore } from '@/store/courseStore';

/** Engagement events only the browser can see (the server's allowlist: app/core/events.py). */
export type ClientEvent =
  | 'citation.clicked'
  | 'source.drawer_opened'
  | 'board.narration_played'
  | 'video.completed';

/**
 * Report an engagement event for the instructor's Engagement panel.
 * Fire-and-forget: analytics must never slow or break what the student is doing.
 */
export function track(eventType: ClientEvent, payload: Record<string, unknown> = {}) {
  const chat = useChatStore.getState();
  const session = chat.sessions.find((s) => s.id === chat.currentSessionId);
  const courseId = session?.courseId ?? useCourseStore.getState().selectedCourseId;
  if (!courseId) return;
  void apiClient.trackEvent({
    event_type: eventType,
    course_id: courseId,
    session_id: session?.id ?? null,
    payload,
  }).catch(() => {});
}
