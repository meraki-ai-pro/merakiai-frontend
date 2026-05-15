"use client";

import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useChatStore, newId } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { apiClient, tokenStore } from "@/services/api";
import { MerakiWebSocket } from "@/services/websocket";
import { parseVTT, getVideoDurationFromSubtitles } from "@/lib/vtt-parser";
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
  WsIncoming,
  WsLearnResponse,
  WsModeSessionStartPush,
  WsModeSessionEvaluationPush,
  WsModeSessionCompletedPush,
} from "@/types/api";

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

  handlerRef.current = (msg: WsIncoming) => {
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
      return;
    }

    if ("status" in msg && (msg as { status: string }).status === "ended") {
      setActiveModeSession(null);
      return;
    }

    if ("error" in msg && !("mode" in msg)) {
      setIsLoadingMessage(false);
      setIsStartingModeSession(false);
      const errMsg = (msg as { error: string }).error;
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    if ("status" in msg && (msg as { status: string }).status === "failed") {
      setIsLoadingMessage(false);
      setIsStartingModeSession(false);
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
  async function handleLearnPush(msg: WsLearnResponse) {
    const { currentSessionId: sid } = useChatStore.getState();
    if (!sid) return;

    const { response, response_format, video_url, audio_url, subtitles_url } =
      msg;
    useChatStore.getState().addMessage({
      id: newId(),
      sessionId: sid,
      role: "assistant",
      content: response,
      responseFormat: response_format,
      videoUrl: video_url ?? null,
      audioUrl: audio_url ?? null,
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
    } else {
      useChatStore.getState().setVideoResponse(null);
    }
    useChatStore.getState().setIsLoadingMessage(false);
    useChatStore.getState().setIsGeneratingVideo(false);
  }

  async function handleModeSessionStartPush(msg: WsModeSessionStartPush) {
    const { currentSessionId: sid, activeModeSession: active } =
      useChatStore.getState();
    if (!sid) return;

    const { prompt, response_format, video_url, audio_url, subtitles_url } =
      msg;
    const totalSteps =
      active?.totalSteps ?? (msg.mode === "application" ? 3 : 10);

    useChatStore.getState().addMessage({
      id: newId(),
      sessionId: sid,
      role: "assistant",
      content: prompt,
      responseFormat: response_format,
      videoUrl: video_url ?? null,
      audioUrl: audio_url ?? null,
      mode: msg.mode,
      messageType: "prompt",
      step: 1,
      totalSteps,
      timestamp: new Date(),
    });

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
    } else {
      useChatStore.getState().setVideoResponse(null);
    }

    pendingModeStartRef.current = null;
    useChatStore.getState().setIsStartingModeSession(false);
  }

  async function handleApplicationTurnPush(
    msg: WsModeSessionEvaluationPush | WsModeSessionCompletedPush,
  ) {
    const { currentSessionId: sid, activeModeSession: active } =
      useChatStore.getState();
    if (!sid || !active) return;

    const { evaluation, type } = msg;
    const evalForMsg = evaluation as unknown as PracticeEvaluation;
    const delivery = (msg as WsModeSessionEvaluationPush).delivery;

    const stepScore = Math.round((evalForMsg.score ?? 0) * 100);
    const updatedScores = [...(active.scores ?? []), stepScore];
    useChatStore.getState().updateActiveModeSession({ scores: updatedScores });

    useChatStore.getState().addMessage({
      id: newId(),
      sessionId: sid,
      role: "assistant",
      content: evalForMsg.feedback,
      responseFormat: delivery?.response_format ?? "text",
      videoUrl: delivery?.video_url ?? null,
      audioUrl: delivery?.audio_url ?? null,
      mode: "application",
      messageType: "evaluation",
      evaluation: evalForMsg,
      step: active.currentStep,
      totalSteps: active.totalSteps,
      timestamp: new Date(),
    });

    if (delivery?.response_format === "video" && delivery.video_url) {
      const { subtitles, duration } = await fetchSubtitles(
        delivery.subtitles_url,
      );
      useChatStore
        .getState()
        .setVideoResponse({
          videoUrl: delivery.video_url,
          audioUrl: delivery.audio_url ?? undefined,
          subtitles,
          duration,
        });
    } else {
      useChatStore.getState().setVideoResponse(null);
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

      // Per-step breakdown from evaluation messages already in the store
      const allMessages = useChatStore.getState().messages;
      const scoreBreakdown = allMessages
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

      useChatStore.getState().addMessage({
        id: newId(),
        sessionId: sid,
        role: "assistant",
        content:
          completedData.summary ??
          "Great work! You have completed this practice scenario.",
        responseFormat: completedData.key_delivery?.response_format ?? "text",
        videoUrl: completedData.key_delivery?.video_url ?? null,
        audioUrl: completedData.key_delivery?.audio_url ?? null,
        mode: "application",
        messageType: "completed",
        keyLearningPoints: completedData.key_learning_points ?? [],
        finalScore,
        scoreBreakdown,
        step: active.totalSteps,
        totalSteps: active.totalSteps,
        timestamp: new Date(),
      });
    } else {
      const evalPush = msg as WsModeSessionEvaluationPush;
      if (evalPush.next_prompt) {
        const nextStep = active.currentStep + 1;
        const nextDelivery = evalPush.next_delivery;
        useChatStore
          .getState()
          .updateActiveModeSession({ currentStep: nextStep });
        useChatStore.getState().addMessage({
          id: newId(),
          sessionId: sid,
          role: "assistant",
          content: evalPush.next_prompt,
          responseFormat: nextDelivery?.response_format ?? "text",
          videoUrl: nextDelivery?.video_url ?? null,
          audioUrl: nextDelivery?.audio_url ?? null,
          mode: "application",
          messageType: "prompt",
          step: nextStep,
          totalSteps: active.totalSteps,
          timestamp: new Date(),
        });
        if (
          nextDelivery?.response_format === "video" &&
          nextDelivery.video_url
        ) {
          const { subtitles, duration } = await fetchSubtitles(
            nextDelivery.subtitles_url,
          );
          useChatStore
            .getState()
            .setVideoResponse({
              videoUrl: nextDelivery.video_url,
              audioUrl: nextDelivery.audio_url ?? undefined,
              subtitles,
              duration,
            });
        }
      }
    }

    useChatStore.getState().setIsLoadingMessage(false);
    useChatStore.getState().setIsGeneratingVideo(false);
  }

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

    useChatStore.getState().addMessage({
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
      timestamp: new Date(),
    });
    useChatStore.getState().setVideoResponse(null);

    if (type === "completed") {
      useChatStore.getState().updateActiveModeSession({ completed: true });

      const finalScore =
        updatedScores.length > 0
          ? Math.round(
              updatedScores.reduce((a, b) => a + b, 0) / updatedScores.length,
            )
          : 0;

      const allMessages = useChatStore.getState().messages;
      const scoreBreakdown = allMessages
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

      useChatStore.getState().addMessage({
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
    } else {
      const evalPush = msg as WsModeSessionEvaluationPush;
      if (evalPush.next_prompt) {
        const nextStep = active.currentStep + 1;
        useChatStore.getState().updateActiveModeSession({
          currentStep: nextStep,
          ...(nextDifficulty ? { difficulty: nextDifficulty } : {}),
        });
        useChatStore.getState().addMessage({
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
      }
    }

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
        let resolvedCourseId = courseId ?? DEFAULT_COURSE_ID;
        if (!resolvedCourseId) {
          const coursesRes = await apiClient.listCourses();
          if (coursesRes.success && coursesRes.data?.courses.length) {
            resolvedCourseId = coursesRes.data.courses[0].id;
          } else {
            throw new Error(
              "No courses available. Please contact your administrator.",
            );
          }
        }

        const res = await apiClient.createSession({
          course_id: resolvedCourseId,
          mode: mode as "learn" | "application" | "review",
          prefers_video: false,
        });
        if (!res.success || !res.data)
          throw new Error(res.error?.message ?? "Failed to create session");

        const session = createSession(firstMessage, mode, res.data.session_id);
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
    [isAuthenticated, createSession, setIsCreatingSession, setError],
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

      setIsStartingModeSession(true);
      setError(null);

      try {
        await apiClient.switchSessionMode(sessionId, mode);
        updateSession(sessionId, {
          currentMode: mode,
          title: getModeSessionTitle(mode, sessionType),
        });
        clearMessages();

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
  }, [
    activeModeSession,
    currentSessionId,
    setActiveModeSession,
    clearMessages,
    updateSession,
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