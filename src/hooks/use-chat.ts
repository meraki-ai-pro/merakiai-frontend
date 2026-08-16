"use client";

import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useChatStore, newId } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { useCourseStore } from "@/store/courseStore";
import { apiClient, tokenStore } from "@/services/api";
import { MerakiWebSocket } from "@/services/websocket";
import { parseVTT, getVideoDurationFromSubtitles } from "@/lib/vtt-parser";
import { debugBackend } from "@/lib/debug";
import {
  PRACTICE_SESSION_TYPES,
  REVIEW_SESSION_TYPES,
  DEFAULT_COURSE_ID,
} from "@/lib/constants";
import type {
  Message,
  TutorMode,
  ActiveModeSession,
  PracticeEvaluation,
  ReviewEvaluation,
} from "@/types";
import type {
  ConversationRow,
  DeliveryBlock,
  TaskStatusResponse,
  WsIncoming,
  WsLearnResponse,
  WsStatusPush,
  WsTextChunk,
  WsSourcesPush,
  WsResponseComplete,
  WsModeSessionStartPush,
  WsModeSessionEvaluationPush,
  WsModeSessionCompletedPush,
} from "@/types/api";

/**
 * Expand one stored turn into the user message and the assistant message the
 * UI renders. Stored as a single row server-side; two bubbles on screen.
 */
function toMessages(row: ConversationRow, sessionId: string): Message[] {
  const timestamp = new Date(row.created_at);
  const out: Message[] = [];

  // "(system)" prefixes are internal turn scaffolding, never shown as if the
  // student typed them — the session list already filters these out.
  if (row.user_input && !row.user_input.startsWith("(system)")) {
    out.push({
      id: `${row.id}-u`,
      sessionId,
      role: "user",
      content: row.user_input,
      mode: row.mode,
      timestamp,
      attachments: row.attachments ?? undefined,
    });
  }

  if (row.tutor_response) {
    out.push({
      id: `${row.id}-a`,
      sessionId,
      role: "assistant",
      content: row.tutor_response,
      mode: row.mode,
      timestamp,
      responseFormat: row.response_format,
      videoUrl: row.video_url,
      audioUrl: row.audio_url,
      sources: row.sources ?? undefined,
    });
  }

  return out;
}

// ─── Label lookups ────────────────────────────────────────────────────────────
const PRACTICE_LABELS = Object.fromEntries(
  PRACTICE_SESSION_TYPES.map((t) => [t.value, t.label]),
);
const REVIEW_LABELS = Object.fromEntries(
  REVIEW_SESSION_TYPES.map((t) => [t.value, t.label]),
);

function getModeSessionTitle(
  mode: "application" | "review",
  sessionType: string,
): string {
  return mode === "application"
    ? `Practice — ${PRACTICE_LABELS[sessionType] ?? sessionType}`
    : `Review — ${REVIEW_LABELS[sessionType] ?? sessionType}`;
}

// ─── Subtitle helper ──────────────────────────────────────────────────────────
async function fetchSubtitles(subtitlesUrl?: string | null) {
  if (!subtitlesUrl) return { subtitles: [], duration: 0 };
  try {
    const vttText = await fetch(subtitlesUrl).then((r) => r.text());
    const subtitles = parseVTT(vttText);
    const duration = getVideoDurationFromSubtitles(subtitles);
    return { subtitles, duration };
  } catch {
    return { subtitles: [], duration: 0 };
  }
}

const COMPLETE_TASK_STATUSES = new Set([
  "completed",
  "complete",
  "done",
  "success",
  "succeeded",
  "finished",
]);
const FAILED_TASK_STATUSES = new Set(["failed", "error"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapTaskResult(status: TaskStatusResponse): Record<string, unknown> | null {
  return (
    asRecord(status.result) ??
    asRecord(status.data) ??
    asRecord(status)
  );
}

function getDeliveryFromRecord(record: Record<string, unknown> | null): DeliveryBlock | null {
  if (!record) return null;

  const nested =
    asRecord(record.delivery) ??
    asRecord(record.key_delivery) ??
    asRecord(record.next_delivery);

  const source = nested ?? record;
  const responseFormat = source.response_format;
  const videoUrl =
    source.video_url ??
    source.result_url ??
    source.download_url ??
    source.hosted_url ??
    source.stream_url;
  const audioUrl = source.audio_url;
  const subtitlesUrl = source.subtitles_url;

  if (
    responseFormat !== "video" &&
    typeof videoUrl !== "string" &&
    typeof audioUrl !== "string"
  ) {
    return null;
  }

  return {
    response_format: responseFormat === "video" ? "video" : "text",
    video_url: typeof videoUrl === "string" ? videoUrl : null,
    audio_url: typeof audioUrl === "string" ? audioUrl : null,
    subtitles_url: typeof subtitlesUrl === "string" ? subtitlesUrl : null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useChat() {
  const store = useChatStore();
  const {
    currentSessionId,
    sessions,
    messages,
    isLoadingMessage,
    isGeneratingVideo,
    currentVideoResponse,
    isCreatingSession,
    isStartingModeSession,
    isSwitchingMode,
    activeModeSession,
    error,
    createSession,
    setCurrentSession,
    deleteSession,
    addMessage,
    clearMessages,
    setIsLoadingMessage,
    setIsGeneratingVideo,
    setVideoResponse,
    setError,
    setIsCreatingSession,
    setActiveModeSession,
    setIsStartingModeSession,
    setIsSwitchingMode,
    updateActiveModeSession,
    updateSession,
  } = store;

  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  const handlerRef = useRef<(msg: WsIncoming) => void>(() => {});

  const pendingModeStartRef = useRef<{
    mode: "application" | "review";
    sessionType: string;
    difficulty: string;
    totalSteps: number;
    scores: number[];
  } | null>(null);

  const pollingTasksRef = useRef<Set<string>>(new Set());
  const autoVideoEnabledRef = useRef<Set<string>>(new Set());
  // Sessions whose transcript has already been fetched this mount, so
  // switching away and back does not re-request it.
  const hydratedSessionsRef = useRef<Set<string>>(new Set());

  const hasActivePollingTask = useCallback((kind: "learn" | "mode") => {
    for (const key of pollingTasksRef.current) {
      if (key.startsWith(`${kind}:`)) return true;
    }
    return false;
  }, []);

  const shouldPreferVideo = useCallback((sessionId: string, mode: TutorMode) => {
    if (mode === "review") return false;
    const session = useChatStore
      .getState()
      .sessions.find((item) => item.id === sessionId);
    return session?.prefersVideo !== false;
  }, []);

  const applyVideoDeliveryToMessage = useCallback(
    async (
      predicate: (message: Message) => boolean,
      delivery: DeliveryBlock | null,
    ) => {
      if (!delivery?.video_url) return false;

      const { subtitles, duration } = await fetchSubtitles(delivery.subtitles_url);
      const state = useChatStore.getState();
      const index = [...state.messages].reverse().findIndex(predicate);
      if (index < 0) return false;

      const messageIndex = state.messages.length - 1 - index;
      const nextMessages = state.messages.map((message, i) =>
        i === messageIndex
          ? {
              ...message,
              responseFormat: "video" as const,
              videoUrl: delivery.video_url ?? null,
              audioUrl: delivery.audio_url ?? null,
              pendingVideo: false,
            }
          : message,
      );

      state.setMessages(nextMessages);
      state.setVideoResponse({
        videoUrl: delivery.video_url,
        audioUrl: delivery.audio_url ?? undefined,
        subtitles,
        duration,
      });
      state.setIsGeneratingVideo(false);
      return true;
    },
    [],
  );

  const clearPendingVideoMessages = useCallback((kind: "learn" | "mode") => {
    const state = useChatStore.getState();
    state.setMessages(
      state.messages.map((message) =>
        message.pendingVideo &&
        (kind === "learn"
          ? message.mode === "learn"
          : message.mode === "application")
          ? { ...message, pendingVideo: false }
          : message,
      ),
    );
  }, []);

  const applyTaskResult = useCallback(
    async (kind: "learn" | "mode", result: Record<string, unknown>) => {
      if (kind === "learn") {
        const delivery = getDeliveryFromRecord(result);
        if (!delivery?.video_url) return;
        const response = result.response;
        await applyVideoDeliveryToMessage(
          (message) =>
            message.role === "assistant" &&
            message.mode === "learn" &&
            (typeof response !== "string" || message.content === response),
          delivery,
        );
        return;
      }

      const prompt = result.prompt;
      const nextPrompt = result.next_prompt;
      const summary = result.summary;
      const evaluation = asRecord(result.evaluation);
      const feedback = evaluation?.feedback;
      const promptDelivery = getDeliveryFromRecord(result);
      const evaluationDelivery = getDeliveryFromRecord(asRecord(result.delivery));
      const nextDelivery = getDeliveryFromRecord(asRecord(result.next_delivery));
      const keyDelivery = getDeliveryFromRecord(asRecord(result.key_delivery));

      if (typeof prompt === "string" && promptDelivery?.video_url) {
        await applyVideoDeliveryToMessage(
          (message) =>
            message.role === "assistant" &&
            message.mode === "application" &&
            message.messageType === "prompt" &&
            message.content === prompt,
          promptDelivery,
        );
      }

      if (typeof feedback === "string" && evaluationDelivery?.video_url) {
        await applyVideoDeliveryToMessage(
          (message) =>
            message.role === "assistant" &&
            message.mode === "application" &&
            message.messageType === "evaluation" &&
            message.content === feedback,
          evaluationDelivery,
        );
      }

      if (typeof nextPrompt === "string" && nextDelivery?.video_url) {
        await applyVideoDeliveryToMessage(
          (message) =>
            message.role === "assistant" &&
            message.mode === "application" &&
            message.messageType === "prompt" &&
            message.content === nextPrompt,
          nextDelivery,
        );
      }

      if (typeof summary === "string" && keyDelivery?.video_url) {
        await applyVideoDeliveryToMessage(
          (message) =>
            message.role === "assistant" &&
            message.mode === "application" &&
            message.messageType === "completed" &&
            message.content === summary,
          keyDelivery,
        );
      }

      if (
        !promptDelivery?.video_url &&
        !evaluationDelivery?.video_url &&
        !nextDelivery?.video_url &&
        !keyDelivery?.video_url
      ) return;

      await applyVideoDeliveryToMessage((message) => {
        if (message.role !== "assistant") return false;
        if (message.mode !== "application") return false;
        if (typeof prompt === "string") {
          return message.messageType === "prompt" && message.content === prompt;
        }
        if (typeof nextPrompt === "string") {
          return message.messageType === "prompt" && message.content === nextPrompt;
        }
        if (typeof feedback === "string") {
          return message.messageType === "evaluation" && message.content === feedback;
        }
        if (typeof summary === "string") {
          return message.messageType === "completed" && message.content === summary;
        }
        return message.responseFormat !== "video";
      }, promptDelivery ?? evaluationDelivery ?? nextDelivery ?? keyDelivery);
    },
    [applyVideoDeliveryToMessage],
  );

  const pollTaskStatus = useCallback(
    async (kind: "learn" | "mode", taskId: string) => {
      const key = `${kind}:${taskId}`;
      if (pollingTasksRef.current.has(key)) return;
      pollingTasksRef.current.add(key);
      useChatStore.getState().setIsGeneratingVideo(true);

      try {
        let appliedVideo = false;
        const startedAt = Date.now();
        while (Date.now() - startedAt < 90_000) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const res =
            kind === "learn"
              ? await apiClient.getRagTaskStatus(taskId)
              : await apiClient.getModeSessionTaskStatus(taskId);

          if (!res.success || !res.data) continue;

          debugBackend(`${kind}:status:${taskId}`, res.data);

          const status = String(res.data.status ?? "").toLowerCase();
          const result = unwrapTaskResult(res.data);
          if (result) {
            const before = useChatStore.getState().messages;
            await applyTaskResult(kind, result);
            appliedVideo =
              appliedVideo ||
              useChatStore.getState().messages.some((message, index) => {
                const previous = before[index];
                return (
                  message.videoUrl &&
                  message.responseFormat === "video" &&
                  previous?.videoUrl !== message.videoUrl
                );
              });
          }

          if (COMPLETE_TASK_STATUSES.has(status)) break;
          if (FAILED_TASK_STATUSES.has(status)) {
            break;
          }
        }
        if (!appliedVideo) clearPendingVideoMessages(kind);
      } finally {
        pollingTasksRef.current.delete(key);
        useChatStore.getState().setIsGeneratingVideo(false);
      }
    },
    [applyTaskResult, clearPendingVideoMessages],
  );

  handlerRef.current = (msg: WsIncoming) => {
    debugBackend("ws:incoming", msg);

    // ── Streaming Learn-mode events (progress panel + token stream) ──────────
    // These carry a `type` discriminator. `response_complete` also has
    // `mode: "learn"`, so it must be intercepted here before the generic
    // learn-push branch below.
    if ("type" in msg) {
      const t = (msg as { type: string }).type;
      if (t === "status") {
        const m = msg as WsStatusPush;
        useChatStore.getState().setStreamingStep(m.stage, m.label);
        setIsLoadingMessage(false);
        return;
      }
      if (t === "text_stream_start") {
        useChatStore.getState().startStreamingResponse();
        setIsLoadingMessage(false);
        return;
      }
      if (t === "text_chunk") {
        useChatStore.getState().appendStreamingChunk((msg as WsTextChunk).chunk);
        setIsLoadingMessage(false);
        return;
      }
      if (t === "sources") {
        // Arrives before the first token, so the answer can show what it is
        // being drawn from while it is still being written.
        useChatStore
          .getState()
          .setStreamingSources((msg as WsSourcesPush).sources ?? []);
        return;
      }
      if (t === "response_complete") {
        void handleResponseComplete(msg as WsResponseComplete);
        return;
      }
      // Practice/Review typewriter events. Unlike Learn, a single turn can
      // include more than one of these back-to-back (e.g. evaluation
      // feedback, then the next question) before the terminal mode push
      // arrives with the structured evaluation/next-prompt/completed data —
      // so, unlike text_stream_start, this does NOT reset the buffer; chunks
      // from consecutive segments concatenate into one continuous reveal.
      if (t === "mode_text_stream_start") {
        useChatStore.getState().startStreamingResponse();
        setIsLoadingMessage(false);
        return;
      }
      if (t === "mode_text_chunk") {
        useChatStore
          .getState()
          .appendStreamingChunk((msg as { chunk: string }).chunk);
        setIsLoadingMessage(false);
        return;
      }
      if (t === "mode_text_stream_end") {
        // No-op — the terminal mode-session push (below) supplies the
        // authoritative final text and structured data shortly after.
        return;
      }
    }

    if (
      "status" in msg &&
      (msg as { status: string }).status === "processing"
    ) {
      const m = msg as {
        status: string;
        task_id: string;
        mode_session_id?: string;
      };
      if (m.mode_session_id && pendingModeStartRef.current) {
        const { mode, sessionType, difficulty, totalSteps } =
          pendingModeStartRef.current;
        setActiveModeSession({
          modeSessionId: m.mode_session_id,
          mode,
          sessionType,
          difficulty,
          currentStep: 1,
          totalSteps,
          completed: false,
          scores: [],
        } as ActiveModeSession);
      }
      if (m.task_id) {
        // Read fresh from the store rather than the closure-captured
        // `activeModeSession` — multiple WS messages can be processed in the
        // same tick, before a re-render refreshes the closure.
        const freshActive = useChatStore.getState().activeModeSession;
        const kind = m.mode_session_id || freshActive ? "mode" : "learn";
        const sid = useChatStore.getState().currentSessionId;
        // Text-first: only poll for async video delivery when this turn
        // actually prefers video (review is always text-only). Text turns —
        // Learn or mode-session — are delivered entirely over the stream, so
        // polling /status would just spin for 90s and wrongly flip the
        // "generating video" indicator on.
        const modeForVideoCheck =
          freshActive?.mode ?? (m.mode_session_id ? "application" : "learn");
        const wantsVideo = sid
          ? shouldPreferVideo(sid, modeForVideoCheck)
          : false;
        if (wantsVideo) void pollTaskStatus(kind, m.task_id);
      }
      return;
    }

    if ("status" in msg && (msg as { status: string }).status === "ended") {
      setActiveModeSession(null);
      return;
    }

    if ("error" in msg && !("mode" in msg)) {
      setIsLoadingMessage(false);
      setIsStartingModeSession(false);
      useChatStore.getState().clearStreamingResponse();
      const errMsg = (msg as { error: string }).error;
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    if ("status" in msg && (msg as { status: string }).status === "failed") {
      setIsLoadingMessage(false);
      setIsStartingModeSession(false);
      useChatStore.getState().clearStreamingResponse();
      const errMsg =
        ("error" in msg ? (msg as { error: string }).error : null) ??
        "Task failed";
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    if ("mode" in msg && (msg as { mode: string }).mode === "learn") {
      handleLearnPush(msg as WsLearnResponse);
      return;
    }

    if ("mode_session_id" in msg && "prompt" in msg) {
      handleModeSessionStartPush(msg as WsModeSessionStartPush);
      return;
    }

    if ("mode" in msg && "type" in msg) {
      const m = msg as WsModeSessionEvaluationPush | WsModeSessionCompletedPush;
      if (m.mode === "application") handleApplicationTurnPush(m);
      else if (m.mode === "review") handleReviewTurnPush(m);
    }
  };

  // ── Push handlers — read fresh state from store directly ──────────────────

  // Snapshot the progress steps captured during a turn (marking them done).
  // Returned steps are attached to the finished message so the transcript
  // keeps a "Completed in N steps" summary. Does NOT clear the streaming
  // buffer — for mode-session turns the text may still be mid-reveal; the
  // buffer is torn down later by commitPendingFinals() once it catches up.
  function takeProgressSteps() {
    const steps = useChatStore.getState().streamingSteps.map((s) => ({
      ...s,
      status: "done" as const,
    }));
    return steps.length ? steps : undefined;
  }

  // Terminal push for a Learn turn. Finalizes the streamed buffer into a
  // persisted message, using msg.response as the authoritative full text and
  // attaching the progress steps captured during generation.
  async function handleResponseComplete(msg: WsResponseComplete) {
    const store = useChatStore.getState();
    const sid = store.currentSessionId;
    if (!sid) {
      store.clearStreamingResponse();
      return;
    }

    const steps = store.streamingSteps.map((s) => ({
      ...s,
      status: "done" as const,
    }));

    const { response, response_format, video_url, audio_url, subtitles_url } =
      msg;

    // Real-time D-ID avatar path: the answer is being spoken live by the
    // persistent AvatarStage over WebRTC, so there is no MP4 to attach. Render
    // the message as normal text; the avatar is a separate, persistent surface.
    const isRealtimeAvatar =
      msg.streaming === true || msg.source === "did_agent";

    const pendingVideo =
      response_format !== "video" &&
      !isRealtimeAvatar &&
      shouldPreferVideo(sid, "learn") &&
      hasActivePollingTask("learn");

    const finalMessage = {
      id: newId(),
      sessionId: sid,
      role: "assistant" as const,
      content: response,
      responseFormat: (isRealtimeAvatar ? "text" : response_format) as
        | "text"
        | "video",
      videoUrl: isRealtimeAvatar ? null : video_url ?? null,
      audioUrl: audio_url ?? null,
      pendingVideo,
      mode: "learn" as const,
      progressSteps: steps.length ? steps : undefined,
      // Prefer the terminal push (authoritative, and present even if the
      // earlier `sources` event was missed by a mid-turn reconnect).
      sources: msg.sources?.length ? msg.sources : store.streamingSources,
      timestamp: new Date(),
    };

    // Text answer (including the real-time avatar case): hand the full text to
    // the smoother as the reveal target and hold the final message until the
    // animation catches up (StreamingResponse calls commitPendingFinals). This
    // makes the stream→final swap seamless.
    if (response_format !== "video" || isRealtimeAvatar) {
      store.updateSession(sid, { previewMessage: response.slice(0, 60) });
      store.setStreamingTarget(response);
      store.setPendingFinals([finalMessage]);
      if (!pendingVideo) store.setVideoResponse(null);
      store.setIsLoadingMessage(false);
      store.setIsGeneratingVideo(pendingVideo);
      return;
    }

    // Video answer: no text stream to catch up on — finalize immediately.
    store.addMessage(finalMessage);
    store.updateSession(sid, { previewMessage: response.slice(0, 60) });
    if (video_url) {
      const { subtitles, duration } = await fetchSubtitles(subtitles_url);
      store.setVideoResponse({
        videoUrl: video_url,
        audioUrl: audio_url ?? undefined,
        subtitles,
        duration,
      });
    }
    store.clearStreamingResponse();
    store.setIsLoadingMessage(false);
    store.setIsGeneratingVideo(pendingVideo);
  }

  async function handleLearnPush(msg: WsLearnResponse) {
    const { currentSessionId: sid } = useChatStore.getState();
    if (!sid) return;

    const { response, response_format, video_url, audio_url, subtitles_url } =
      msg;
    const pendingVideo =
      response_format !== "video" &&
      shouldPreferVideo(sid, "learn") &&
      hasActivePollingTask("learn");
    useChatStore.getState().addMessage({
      id: newId(),
      sessionId: sid,
      role: "assistant",
      content: response,
      responseFormat: response_format,
      videoUrl: video_url ?? null,
      audioUrl: audio_url ?? null,
      pendingVideo,
      mode: "learn",
      timestamp: new Date(),
    });
    useChatStore
      .getState()
      .updateSession(sid, { previewMessage: response.slice(0, 60) });

    if (response_format === "video" && video_url) {
      const { subtitles, duration } = await fetchSubtitles(subtitles_url);
      useChatStore
        .getState()
        .setVideoResponse({
          videoUrl: video_url,
          audioUrl: audio_url ?? undefined,
          subtitles,
          duration,
        });
    } else if (!pendingVideo) {
      useChatStore.getState().setVideoResponse(null);
    }
    useChatStore.getState().setIsLoadingMessage(false);
    useChatStore.getState().setIsGeneratingVideo(pendingVideo);
  }

  async function handleModeSessionStartPush(msg: WsModeSessionStartPush) {
    const { currentSessionId: sid, activeModeSession: active } =
      useChatStore.getState();
    if (!sid) return;

    const { prompt, response_format, video_url, audio_url, subtitles_url } =
      msg;
    const totalSteps =
      active?.totalSteps ?? (msg.mode === "application" ? 3 : 10);
    const pendingVideo =
      msg.mode === "application" &&
      response_format !== "video" &&
      shouldPreferVideo(sid, msg.mode) &&
      hasActivePollingTask("mode");
    const progressSteps = takeProgressSteps();

    const finalMessage: Message = {
      id: newId(),
      sessionId: sid,
      role: "assistant",
      content: prompt,
      responseFormat: response_format,
      videoUrl: video_url ?? null,
      audioUrl: audio_url ?? null,
      pendingVideo,
      mode: msg.mode,
      messageType: "prompt",
      step: 1,
      totalSteps,
      progressSteps,
      timestamp: new Date(),
    };

    if (response_format === "video" && video_url) {
      useChatStore.getState().addMessage(finalMessage);
      const { subtitles, duration } = await fetchSubtitles(subtitles_url);
      useChatStore
        .getState()
        .setVideoResponse({
          videoUrl: video_url,
          audioUrl: audio_url ?? undefined,
          subtitles,
          duration,
        });
      useChatStore.getState().clearStreamingResponse();
    } else {
      // Text prompt: the typewriter chunks already streamed this exact text
      // into the buffer, so just hand it to the smoother as the reveal target
      // and hold the message until the reveal catches up (pop-free swap).
      useChatStore.getState().setStreamingTarget(prompt);
      useChatStore.getState().setPendingFinals([finalMessage]);
      if (!pendingVideo) useChatStore.getState().setVideoResponse(null);
    }

    pendingModeStartRef.current = null;
    useChatStore.getState().setIsStartingModeSession(false);
  }

  // Practice turn. A turn produces one message (evaluation) or two (evaluation
  // + next question, or evaluation + completion summary). Each was already
  // typed out live via mode_text_chunk before this terminal push arrived, so
  // any text (non-video) part is deferred into pendingFinals — reusing the
  // same streamed buffer as the reveal target — and committed once the smooth
  // reveal catches up, exactly like Learn's response_complete. Video parts
  // (rare — opt-in) have no text to catch up on, so they commit immediately.
  async function handleApplicationTurnPush(
    msg: WsModeSessionEvaluationPush | WsModeSessionCompletedPush,
  ) {
    const { currentSessionId: sid, activeModeSession: active } =
      useChatStore.getState();
    if (!sid || !active) return;

    const { evaluation, type } = msg;
    const evalForMsg = evaluation as unknown as PracticeEvaluation;
    const delivery = (msg as WsModeSessionEvaluationPush).delivery;
    const pendingEvaluationVideo =
      !delivery?.video_url &&
      shouldPreferVideo(sid, "application") &&
      hasActivePollingTask("mode");

    const stepScore = Math.round((evalForMsg.score ?? 0) * 100);
    const updatedScores = [...(active.scores ?? []), stepScore];
    useChatStore.getState().updateActiveModeSession({ scores: updatedScores });
    const progressSteps = takeProgressSteps();

    const evalMessage: Message = {
      id: newId(),
      sessionId: sid,
      role: "assistant",
      content: evalForMsg.feedback,
      responseFormat: delivery?.response_format ?? "text",
      videoUrl: delivery?.video_url ?? null,
      audioUrl: delivery?.audio_url ?? null,
      pendingVideo: pendingEvaluationVideo,
      mode: "application",
      messageType: "evaluation",
      evaluation: evalForMsg,
      step: active.currentStep,
      totalSteps: active.totalSteps,
      progressSteps,
      timestamp: new Date(),
    };

    const deferred: Message[] = [];
    const streamParts: string[] = [];

    if (delivery?.response_format === "video" && delivery.video_url) {
      useChatStore.getState().addMessage(evalMessage);
      const { subtitles, duration } = await fetchSubtitles(
        delivery.subtitles_url,
      );
      useChatStore.getState().setVideoResponse({
        videoUrl: delivery.video_url,
        audioUrl: delivery.audio_url ?? undefined,
        subtitles,
        duration,
      });
    } else {
      deferred.push(evalMessage);
      streamParts.push(evalForMsg.feedback);
      if (!pendingEvaluationVideo) useChatStore.getState().setVideoResponse(null);
    }

    if (type === "completed") {
      const completedData = msg as WsModeSessionCompletedPush;
      useChatStore.getState().updateActiveModeSession({ completed: true });

      // Final score = average of all step scores
      const finalScore =
        updatedScores.length > 0
          ? Math.round(
              updatedScores.reduce((a, b) => a + b, 0) / updatedScores.length,
            )
          : 0;

      // Per-step breakdown from evaluation messages already in the store,
      // plus this turn's evalMessage — which may still be deferred (not yet
      // committed to the store) if it's a text response.
      const allMessages = useChatStore.getState().messages;
      const scoreBreakdown = [...allMessages, evalMessage]
        .filter(
          (m) =>
            m.messageType === "evaluation" &&
            m.mode === "application" &&
            m.evaluation,
        )
        .map((m) => ({
          step: m.step ?? 0,
          score: Math.round((m.evaluation!.score ?? 0) * 100),
          verdict: m.evaluation!.verdict,
        }));

      const summaryText =
        completedData.summary ??
        "Great work! You have completed this practice scenario.";
      const keyDelivery = completedData.key_delivery;

      const completedMessage: Message = {
        id: newId(),
        sessionId: sid,
        role: "assistant",
        content: summaryText,
        responseFormat: keyDelivery?.response_format ?? "text",
        videoUrl: keyDelivery?.video_url ?? null,
        audioUrl: keyDelivery?.audio_url ?? null,
        pendingVideo:
          !keyDelivery?.video_url &&
          shouldPreferVideo(sid, "application") &&
          hasActivePollingTask("mode"),
        mode: "application",
        messageType: "completed",
        keyLearningPoints: completedData.key_learning_points ?? [],
        finalScore,
        scoreBreakdown,
        step: active.totalSteps,
        totalSteps: active.totalSteps,
        timestamp: new Date(),
      };

      if (keyDelivery?.response_format === "video" && keyDelivery.video_url) {
        useChatStore.getState().addMessage(completedMessage);
        const { subtitles, duration } = await fetchSubtitles(
          keyDelivery.subtitles_url,
        );
        useChatStore.getState().setVideoResponse({
          videoUrl: keyDelivery.video_url,
          audioUrl: keyDelivery.audio_url ?? undefined,
          subtitles,
          duration,
        });
      } else {
        deferred.push(completedMessage);
        streamParts.push(summaryText);
      }
    } else {
      const evalPush = msg as WsModeSessionEvaluationPush;
      if (evalPush.next_prompt) {
        const nextStep = active.currentStep + 1;
        const nextDelivery = evalPush.next_delivery;
        const pendingNextVideo =
          !nextDelivery?.video_url &&
          shouldPreferVideo(sid, "application") &&
          hasActivePollingTask("mode");
        useChatStore
          .getState()
          .updateActiveModeSession({ currentStep: nextStep });

        const nextMessage: Message = {
          id: newId(),
          sessionId: sid,
          role: "assistant",
          content: evalPush.next_prompt,
          responseFormat: nextDelivery?.response_format ?? "text",
          videoUrl: nextDelivery?.video_url ?? null,
          audioUrl: nextDelivery?.audio_url ?? null,
          pendingVideo: pendingNextVideo,
          mode: "application",
          messageType: "prompt",
          step: nextStep,
          totalSteps: active.totalSteps,
          timestamp: new Date(),
        };

        if (
          nextDelivery?.response_format === "video" &&
          nextDelivery.video_url
        ) {
          useChatStore.getState().addMessage(nextMessage);
          const { subtitles, duration } = await fetchSubtitles(
            nextDelivery.subtitles_url,
          );
          useChatStore.getState().setVideoResponse({
            videoUrl: nextDelivery.video_url,
            audioUrl: nextDelivery.audio_url ?? undefined,
            subtitles,
            duration,
          });
        } else {
          deferred.push(nextMessage);
          streamParts.push(evalPush.next_prompt);
        }
      }
    }

    if (deferred.length > 0) {
      useChatStore.getState().setStreamingTarget(streamParts.join(" "));
      useChatStore.getState().setPendingFinals(deferred);
    } else {
      useChatStore.getState().clearStreamingResponse();
    }

    useChatStore.getState().setIsLoadingMessage(false);
    useChatStore.getState().setIsGeneratingVideo(hasActivePollingTask("mode"));
  }

  // Review turn — always text-only (no video path), so every part of the
  // turn is deferred: the feedback (and, if present, the next question or
  // completion summary) were already typed out live via mode_text_chunk, so
  // we hand that same text to the smoother and commit once it catches up.
  function handleReviewTurnPush(
    msg: WsModeSessionEvaluationPush | WsModeSessionCompletedPush,
  ) {
    const { currentSessionId: sid, activeModeSession: active } =
      useChatStore.getState();
    if (!sid || !active) return;

    const { evaluation, type } = msg;
    const evalForMsg = evaluation as unknown as ReviewEvaluation;
    const nextDifficulty = (msg as WsModeSessionEvaluationPush).next_difficulty;

    const stepScore = Math.round((evalForMsg.score ?? 0) * 100);
    const updatedScores = [...(active.scores ?? []), stepScore];
    useChatStore.getState().updateActiveModeSession({ scores: updatedScores });
    const progressSteps = takeProgressSteps();

    const evalMessage: Message = {
      id: newId(),
      sessionId: sid,
      role: "assistant",
      content: evalForMsg.feedback,
      responseFormat: "text",
      videoUrl: null,
      audioUrl: null,
      mode: "review",
      messageType: "evaluation",
      evaluation: evalForMsg,
      nextDifficulty,
      step: active.currentStep,
      totalSteps: active.totalSteps,
      progressSteps,
      timestamp: new Date(),
    };

    useChatStore.getState().setVideoResponse(null);

    const deferred: Message[] = [evalMessage];
    const streamParts: string[] = [evalForMsg.feedback];

    if (type === "completed") {
      useChatStore.getState().updateActiveModeSession({ completed: true });

      const finalScore =
        updatedScores.length > 0
          ? Math.round(
              updatedScores.reduce((a, b) => a + b, 0) / updatedScores.length,
            )
          : 0;

      // Include this turn's evalMessage manually — it's still deferred (not
      // yet in the store) at this point.
      const allMessages = useChatStore.getState().messages;
      const scoreBreakdown = [...allMessages, evalMessage]
        .filter(
          (m) =>
            m.messageType === "evaluation" &&
            m.mode === "review" &&
            m.evaluation,
        )
        .map((m) => ({
          step: m.step ?? 0,
          score: Math.round((m.evaluation!.score ?? 0) * 100),
          verdict: m.evaluation!.verdict,
        }));

      deferred.push({
        id: newId(),
        sessionId: sid,
        role: "assistant",
        content: "",
        responseFormat: "text",
        videoUrl: null,
        audioUrl: null,
        mode: "review",
        messageType: "completed",
        finalScore,
        scoreBreakdown,
        step: active.totalSteps,
        totalSteps: active.totalSteps,
        timestamp: new Date(),
      });
      // Completed summary card carries no text of its own to stream.
    } else {
      const evalPush = msg as WsModeSessionEvaluationPush;
      if (evalPush.next_prompt) {
        const nextStep = active.currentStep + 1;
        useChatStore.getState().updateActiveModeSession({
          currentStep: nextStep,
          ...(nextDifficulty ? { difficulty: nextDifficulty } : {}),
        });
        deferred.push({
          id: newId(),
          sessionId: sid,
          role: "assistant",
          content: evalPush.next_prompt,
          responseFormat: "text",
          videoUrl: null,
          audioUrl: null,
          mode: "review",
          messageType: "prompt",
          step: nextStep,
          totalSteps: active.totalSteps,
          timestamp: new Date(),
        });
        streamParts.push(evalPush.next_prompt);
      }
    }

    useChatStore.getState().setStreamingTarget(streamParts.join(" "));
    useChatStore.getState().setPendingFinals(deferred);

    useChatStore.getState().setIsLoadingMessage(false);
  }


  useEffect(() => {
    if (!currentSessionId || !isAuthenticated) return;

    MerakiWebSocket.getOrCreate({
      sessionId: currentSessionId,
      getToken: () => tokenStore.get(),
      onMessage: (msg) => handlerRef.current(msg),
      onAuthError: () => {
        toast.error("Session expired. Please log in again.");
        apiClient.logout();
      },
    });


  }, [currentSessionId, isAuthenticated]);

  // Rehydrate the transcript when a session is opened.
  //
  // The store persists `sessions` but not `messages`, and nothing called
  // getConversations, so every reload dropped the whole conversation — not
  // just its citations. Sources and attachments now come back with it.
  useEffect(() => {
    if (!currentSessionId || !isAuthenticated) return;
    if (hydratedSessionsRef.current.has(currentSessionId)) return;

    // Claim the id before awaiting so a fast re-render cannot double-fetch.
    hydratedSessionsRef.current.add(currentSessionId);
    let cancelled = false;

    (async () => {
      try {
        const res = await apiClient.getConversations(currentSessionId);
        const rows = res?.data?.conversations ?? [];
        if (cancelled || !rows.length) return;

        // Never clobber a turn already on screen: the user may have sent a
        // message while this was in flight, and a mid-flight answer is not in
        // the database yet.
        const store = useChatStore.getState();
        if (store.currentSessionId !== currentSessionId) return;
        if (store.messages.length) return;

        store.setMessages(
          rows.flatMap((row: ConversationRow) => toMessages(row, currentSessionId)),
        );
      } catch (err) {
        // A missing transcript is a degraded view, not a broken session —
        // the user can still ask their next question.
        debugBackend("conversation hydration failed", err);
        hydratedSessionsRef.current.delete(currentSessionId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSessionId, isAuthenticated]);

  const ensureWs = useCallback(async (sessionId: string) => {
    MerakiWebSocket.getOrCreate({
      sessionId,
      getToken: () => tokenStore.get(),
      onMessage: (msg) => handlerRef.current(msg),
      onAuthError: () => {
        toast.error("Session expired. Please log in again.");
        apiClient.logout();
      },
    });

    // If the socket is still connecting give it up to 1 s
    const ws = MerakiWebSocket.getOrCreate({
      sessionId,
      getToken: () => tokenStore.get(),
      onMessage: (msg) => handlerRef.current(msg),
      onAuthError: () => {},
    });

    if (ws.readyState !== WebSocket.OPEN) {
      await new Promise<void>((resolve) => {
        const deadline = Date.now() + 1000;
        const check = () => {
          if (ws.readyState === WebSocket.OPEN || Date.now() >= deadline)
            resolve();
          else setTimeout(check, 50);
        };
        check();
      });
    }
  }, []);

  // Text-first: never force video on. Video is opt-in via toggleVideoPreference.
  // Kept as a no-op so existing call sites don't need to change.
  const ensureVideoPreference = useCallback(
    async (_sessionId: string, _mode: TutorMode) => {
      return;
    },
    [],
  );

  useEffect(() => {
    if (!currentSessionId || !isAuthenticated) return;

    const session = sessions.find((item) => item.id === currentSessionId);
    const mode = session?.currentMode ?? session?.mode ?? "learn";
    if (!session || mode === "review" || session.prefersVideo !== false) return;
    if (autoVideoEnabledRef.current.has(currentSessionId)) return;

    autoVideoEnabledRef.current.add(currentSessionId);
    void ensureVideoPreference(currentSessionId, mode);
  }, [currentSessionId, ensureVideoPreference, isAuthenticated, sessions]);

  // ─── Create backend session ────────────────────────────────────────────────
  const startNewSession = useCallback(
    async (
      firstMessage?: string,
      mode: TutorMode = "learn",
      courseId?: string,
    ) => {
      if (!isAuthenticated) {
        toast.error("Please log in to continue.");
        return null;
      }

      setIsCreatingSession(true);
      setError(null);

      try {
        // Order matters: an explicit argument, then what the student picked in
        // the course switcher, then their enrolments. DEFAULT_COURSE_ID is last
        // and only covers a single-course deployment — reaching for it first
        // started every session on 'froth-flotation' no matter what the student
        // was enrolled on, which the backend then rejected as a 403.
        let resolvedCourseId = courseId ?? useCourseStore.getState().selectedCourseId;

        if (!resolvedCourseId) {
          const enrolled = await useCourseStore.getState().loadCourses();
          resolvedCourseId = enrolled[0]?.id ?? null;
        }

        if (!resolvedCourseId) {
          const coursesRes = await apiClient.listCourses();
          resolvedCourseId =
            coursesRes.data?.courses?.[0]?.id ?? DEFAULT_COURSE_ID ?? null;
        }

        if (!resolvedCourseId) {
          throw new Error(
            "You are not enrolled on any course yet. Enter the invite code your lecturer gave you.",
          );
        }

        const res = await apiClient.createSession({
          course_id: resolvedCourseId,
          mode: mode as "learn" | "application" | "review",
          // Text-first: sessions start without video; users opt in via the toggle.
          prefers_video: false,
        });
        if (!res.success || !res.data)
          throw new Error(res.error?.message ?? "Failed to create session");

        const session = createSession(firstMessage, mode, res.data.session_id);
        updateSession(session.id, {
          prefersVideo: res.data.prefers_video,
          currentMode: res.data.current_mode,
          courseId: res.data.course_id,
          startedAt: res.data.started_at,
        });
        return session;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create session";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsCreatingSession(false);
      }
    },
    [isAuthenticated, createSession, updateSession, setIsCreatingSession, setError],
  );

  // ─── Learn mode message ────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string, mode: TutorMode = "learn", isRetry = false) => {
      if (!text.trim()) return;
      if (!isAuthenticated) {
        toast.error("Please log in to continue.");
        return;
      }

      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = await startNewSession(text, mode);
        if (!session) return;
        sessionId = session.id;
      }

      await ensureVideoPreference(sessionId, mode);

      if (!isRetry) {
        addMessage({
          id: newId(),
          sessionId,
          role: "user",
          content: text.trim(),
          responseFormat: "text",
          mode: "learn",
          timestamp: new Date(),
        });
      }

      setIsLoadingMessage(true);
      setIsGeneratingVideo(false);
      setError(null);
      useChatStore.getState().clearStreamingResponse();

      await ensureWs(sessionId);
      MerakiWebSocket.getOrCreate({
        sessionId,
        getToken: () => tokenStore.get(),
        onMessage: (msg) => handlerRef.current(msg),
        onAuthError: () => {},
      }).sendLearnMessage(text.trim());
    },
    [
      currentSessionId,
      isAuthenticated,
      startNewSession,
      addMessage,
      setIsLoadingMessage,
      setIsGeneratingVideo,
      setError,
      ensureWs,
      ensureVideoPreference,
    ],
  );

  // ─── Retry ────────────────────────────────────────────────────────────────
  const retryLastMessage = useCallback(async () => {
    const userMessages = messages.filter((m) => m.role === "user");
    if (!userMessages.length) return;
    const last = userMessages[userMessages.length - 1];
    setError(null);
    await sendMessage(last.content, last.mode ?? "learn", true);
  }, [messages, sendMessage, setError]);

  // ─── Start Application / Review mode session ───────────────────────────────
  const startModeSession = useCallback(
    async (
      mode: "application" | "review",
      sessionType: string,
      difficulty: "Basic" | "Intermediate" | "Advanced" = "Basic",
    ) => {
      if (!isAuthenticated) {
        toast.error("Please log in to continue.");
        return null;
      }

      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = await startNewSession(undefined, mode);
        if (!session) return null;
        sessionId = session.id;
      }

      await ensureVideoPreference(sessionId, mode);

      setIsStartingModeSession(true);
      setError(null);

      try {
        await apiClient.switchSessionMode(sessionId, mode);
        updateSession(sessionId, {
          currentMode: mode,
          title: getModeSessionTitle(mode, sessionType),
        });
        clearMessages();
        useChatStore.getState().clearStreamingResponse();

        const totalSteps = mode === "application" ? 3 : 10;
        pendingModeStartRef.current = {
          mode,
          sessionType,
          difficulty,
          totalSteps,
          scores: [],
        };

        await ensureWs(sessionId);
        MerakiWebSocket.getOrCreate({
          sessionId,
          getToken: () => tokenStore.get(),
          onMessage: (msg) => handlerRef.current(msg),
          onAuthError: () => {},
        }).startModeSession({
          mode,
          session_type: sessionType,
          difficulty,
          total_items: totalSteps,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start mode session";
        setError(message);
        toast.error(message);
        setIsStartingModeSession(false);
        pendingModeStartRef.current = null;
      }
    },
    [
      isAuthenticated,
      currentSessionId,
      startNewSession,
      setIsStartingModeSession,
      setError,
      updateSession,
      clearMessages,
      ensureWs,
      ensureVideoPreference,
    ],
  );

  // ─── End mode session manually ────────────────────────────────────────────
  const endModeSession = useCallback(async () => {
    if (!activeModeSession || !currentSessionId) return;
    MerakiWebSocket.getOrCreate({
      sessionId: currentSessionId,
      getToken: () => tokenStore.get(),
      onMessage: (msg) => handlerRef.current(msg),
      onAuthError: () => {},
    }).endModeSession(activeModeSession.modeSessionId);
    setActiveModeSession(null);
    clearMessages();
    await apiClient.switchSessionMode(currentSessionId, "learn");
    updateSession(currentSessionId, { currentMode: "learn" });
    await ensureVideoPreference(currentSessionId, "learn");
  }, [
    activeModeSession,
    currentSessionId,
    setActiveModeSession,
    clearMessages,
    updateSession,
    ensureVideoPreference,
  ]);

  // ─── Switch session type (within same mode) ────────────────────────────────
  const switchSessionType = useCallback(
    async (newSessionType: string) => {
      if (
        !activeModeSession ||
        newSessionType === activeModeSession.sessionType ||
        !currentSessionId
      )
        return;

      const { mode, difficulty, totalSteps, modeSessionId } = activeModeSession;
      setIsStartingModeSession(true);
      setError(null);

      try {
        MerakiWebSocket.getOrCreate({
          sessionId: currentSessionId,
          getToken: () => tokenStore.get(),
          onMessage: (msg) => handlerRef.current(msg),
          onAuthError: () => {},
        }).endModeSession(modeSessionId);

        clearMessages();
        updateSession(currentSessionId, {
          title: getModeSessionTitle(mode, newSessionType),
        });
        pendingModeStartRef.current = {
          mode,
          sessionType: newSessionType,
          difficulty,
          totalSteps,
          scores: [],
        };

        await ensureWs(currentSessionId);
        MerakiWebSocket.getOrCreate({
          sessionId: currentSessionId,
          getToken: () => tokenStore.get(),
          onMessage: (msg) => handlerRef.current(msg),
          onAuthError: () => {},
        }).startModeSession({
          mode,
          session_type: newSessionType,
          difficulty: difficulty as "Basic" | "Intermediate" | "Advanced",
          total_items: mode === "application" ? 3 : totalSteps,
        });

        const labels = mode === "application" ? PRACTICE_LABELS : REVIEW_LABELS;
        toast.success(
          `Switched to ${labels[newSessionType] ?? newSessionType}`,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to switch session type";
        setError(message);
        toast.error(message);
        setIsStartingModeSession(false);
      }
    },
    [
      activeModeSession,
      currentSessionId,
      clearMessages,
      setIsStartingModeSession,
      setError,
      updateSession,
      ensureWs,
    ],
  );

  // ─── Toggle video preference ───────────────────────────────────────────────
  const toggleVideoPreference = useCallback(
    async (prefersVideo: boolean) => {
      if (!currentSessionId) return;
      try {
        const res = await apiClient.setVideoPreference(
          currentSessionId,
          prefersVideo,
        );
        if (res.success) updateSession(currentSessionId, { prefersVideo });
      } catch {
        /* silent */
      }
    },
    [currentSessionId, updateSession],
  );

  // ─── Switch mode (learn / application / review) ────────────────────────────
  const switchMode = useCallback(
    async (mode: TutorMode) => {
      if (!currentSessionId) return;
      setIsSwitchingMode(true);
      setError(null);
      try {
        await apiClient.switchSessionMode(
          currentSessionId,
          mode as "learn" | "application" | "review",
        );
        updateSession(currentSessionId, { currentMode: mode });
        await ensureVideoPreference(currentSessionId, mode);
        if (mode === "learn") {
          setActiveModeSession(null);
          clearMessages();
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to switch mode";
        setError(message);
        toast.error(message);
      } finally {
        setIsSwitchingMode(false);
      }
    },
    [
      currentSessionId,
      updateSession,
      setIsSwitchingMode,
      setError,
      setActiveModeSession,
      clearMessages,
      ensureVideoPreference,
    ],
  );

  // ─── Submit answer in application or review mode ──────────────────────────
  const sendModeMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeModeSession || !currentSessionId) return;

      addMessage({
        id: newId(),
        sessionId: currentSessionId,
        role: "user",
        content: text.trim(),
        responseFormat: "text",
        mode: activeModeSession.mode,
        timestamp: new Date(),
      });
      setIsLoadingMessage(true);
      setError(null);
      useChatStore.getState().clearStreamingResponse();

      await ensureWs(currentSessionId);
      MerakiWebSocket.getOrCreate({
        sessionId: currentSessionId,
        getToken: () => tokenStore.get(),
        onMessage: (msg) => handlerRef.current(msg),
        onAuthError: () => {},
      }).sendModeAnswer(activeModeSession.modeSessionId, text.trim());
    },
    [
      activeModeSession,
      currentSessionId,
      addMessage,
      setIsLoadingMessage,
      setError,
      ensureWs,
    ],
  );

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) ?? null;

  return {
    sessions,
    currentSession,
    currentSessionId,
    messages,
    isLoadingMessage,
    isGeneratingVideo,
    isCreatingSession,
    isStartingModeSession,
    isSwitchingMode,
    activeModeSession,
    currentVideoResponse,
    error,
    startNewSession,
    sendMessage,
    sendModeMessage,
    retryLastMessage,
    startModeSession,
    switchMode,
    endModeSession,
    switchSessionType,
    toggleVideoPreference,
    setCurrentSession,
    deleteSession,
  };
}
