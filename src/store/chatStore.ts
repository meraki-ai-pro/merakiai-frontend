import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, Session, VideoResponse, TutorMode, ActiveModeSession, ProgressStep } from '@/types';
import type { RetrievedSource } from '@/types/api';

export type AvatarStatus = 'off' | 'connecting' | 'live' | 'error';

// Shared uuid util — safe fallback for non-secure contexts (HTTP) and SSR
export const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC4122 v4 UUID via Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isLoadingMessage: boolean;
  isGeneratingVideo: boolean;
  currentVideoResponse: VideoResponse | null;
  error: string | null;
  isCreatingSession: boolean;
  sessionsLoadedFromBackend: boolean;

  // ── Live streaming assistant turn (Learn mode) ─────────────────────────────
  isStreamingResponse: boolean;
  streamingContent: string;
  streamingSteps: ProgressStep[];
  // Final message(s) held back until the smooth reveal catches up (pop-free
  // handoff). An array because one mode-session turn can produce two messages
  // (e.g. an evaluation card + the next question) that arrive as a single push
  // after several back-to-back typewriter segments.
  pendingFinals: Message[];
  // Passages retrieval settled on for the in-flight turn. Arrive ahead of the
  // first token so the answer can show its grounding while it is still writing.
  streamingSources: RetrievedSource[];

  // ── Source inspection side sheet ───────────────────────────────────────────
  sourceDrawer: { sources: RetrievedSource[]; activeCitation: number | null } | null;

  // ── Real-time D-ID avatar (WebRTC) ─────────────────────────────────────────
  avatarStream: MediaStream | null;
  avatarStatus: AvatarStatus;
  avatarSpeaking: boolean;

  // ── Mode session tracking ──────────────────────────────────────────────────
  activeModeSession: ActiveModeSession | null;
  isStartingModeSession: boolean;
  isSwitchingMode: boolean;

  createSession: (firstMessage?: string, mode?: TutorMode, backendSessionId?: string) => Session;
  setCurrentSession: (id: string | null) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setIsLoadingMessage: (v: boolean) => void;
  setIsGeneratingVideo: (v: boolean) => void;
  setVideoResponse: (v: VideoResponse | null) => void;
  setError: (v: string | null) => void;
  setIsCreatingSession: (v: boolean) => void;
  setSessionsLoadedFromBackend: (v: boolean) => void;

  // Live streaming turn actions
  startStreamingResponse: () => void;
  appendStreamingChunk: (text: string) => void;
  setStreamingStep: (stage: string, label: string) => void;
  setStreamingTarget: (text: string) => void;
  setPendingFinals: (messages: Message[]) => void;
  commitPendingFinals: () => void;
  clearStreamingResponse: () => void;
  setStreamingSources: (sources: RetrievedSource[]) => void;
  openSourceDrawer: (sources: RetrievedSource[], citation?: number) => void;
  closeSourceDrawer: () => void;

  setActiveModeSession: (v: ActiveModeSession | null) => void;
  setIsStartingModeSession: (v: boolean) => void;
  setIsSwitchingMode: (v: boolean) => void;
  updateActiveModeSession: (updates: Partial<ActiveModeSession>) => void;

  // Real-time avatar actions
  setAvatarStream: (stream: MediaStream | null) => void;
  setAvatarStatus: (status: AvatarStatus) => void;
  setAvatarSpeaking: (speaking: boolean) => void;

  // Legacy aliases
  conversations: Session[];
  currentConversationId: string | null;
  setCurrentConversation: (id: string | null) => void;
  addConversation: (session: Session) => void;
  deleteConversation: (id: string) => void;
  setConversations: (sessions: Session[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      messages: [],
      isLoadingMessage: false,
      isGeneratingVideo: false,
      currentVideoResponse: null,
      error: null,
      isCreatingSession: false,
      sessionsLoadedFromBackend: false,
      isStreamingResponse: false,
      streamingContent: '',
      streamingSteps: [],
      pendingFinals: [],
      streamingSources: [],
      sourceDrawer: null,
      avatarStream: null,
      avatarStatus: 'off',
      avatarSpeaking: false,
      activeModeSession: null,
      isStartingModeSession: false,
      isSwitchingMode: false,

      createSession: (firstMessage, mode = 'learn', backendSessionId) => {
        const session: Session = {
          id: backendSessionId || newId(),
          title: firstMessage
            ? firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '…' : '')
            : 'New session',
          mode,
          currentMode: mode,
          // Text-first: video is opt-in via the toggle, never forced on.
          prefersVideo: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0,
        };
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
          messages: [],
          currentVideoResponse: null,
          error: null,
          activeModeSession: null,
        }));
        return session;
      },

      setCurrentSession: (id) =>
        set({
          currentSessionId: id,
          messages: [],
          currentVideoResponse: null,
          error: null,
          activeModeSession: null,
        }),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          ...(state.currentSessionId === id
            ? {
                currentSessionId: null,
                messages: [],
                currentVideoResponse: null,
                activeModeSession: null,
              }
            : {}),
        })),

      addMessage: (message) =>
        set((state) => {
          const newMessages = [...state.messages, message];
          const sid = state.currentSessionId;
          return {
            messages: newMessages,
            sessions: state.sessions.map((s) =>
              s.id === sid
                ? {
                    ...s,
                    messageCount: newMessages.length,
                    previewMessage:
                      message.role === 'assistant'
                        ? message.content.slice(0, 60)
                        : s.previewMessage,
                    updatedAt: new Date(),
                  }
                : s
            ),
          };
        }),

      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [], currentVideoResponse: null }),

      setIsLoadingMessage: (v) => set({ isLoadingMessage: v }),
      setIsGeneratingVideo: (v) => set({ isGeneratingVideo: v }),
      setVideoResponse: (v) => set({ currentVideoResponse: v }),
      setError: (v) => set({ error: v }),
      setIsCreatingSession: (v) => set({ isCreatingSession: v }),
      setSessionsLoadedFromBackend: (v) => set({ sessionsLoadedFromBackend: v }),

      // ── Live streaming turn ────────────────────────────────────────────────
      // Note: content is intentionally NOT reset here. Callers clear it
      // explicitly via clearStreamingResponse() before starting a brand-new
      // turn. This lets a mode-session turn's multiple back-to-back
      // typewriter segments (e.g. evaluation text, then next-question text)
      // concatenate into one continuous reveal instead of wiping mid-turn.
      startStreamingResponse: () => set({ isStreamingResponse: true }),

      appendStreamingChunk: (text) =>
        set((state) => ({
          isStreamingResponse: true,
          streamingContent: state.streamingContent + text,
        })),

      setStreamingStep: (stage, label) =>
        set((state) => {
          // Mark the previously-active step done, then append the new one.
          const prior = state.streamingSteps.map((s) =>
            s.status === 'active' ? { ...s, status: 'done' as const } : s
          );
          return {
            isStreamingResponse: true,
            streamingSteps: [...prior, { stage, label, status: 'active' as const }],
          };
        }),

      // Set the authoritative full text (from response_complete) as the reveal
      // target so the smoother finishes on the exact final content.
      setStreamingTarget: (text) => set({ streamingContent: text }),

      setPendingFinals: (messages) => set({ pendingFinals: messages }),

      // Called once the smooth reveal has caught up: commit the held-back
      // message(s) in order and tear down the streaming view (no visible pop).
      commitPendingFinals: () => {
        const pending = get().pendingFinals;
        if (!pending.length) return;
        for (const message of pending) get().addMessage(message);
        set({
          isStreamingResponse: false,
          streamingContent: '',
          streamingSteps: [],
          pendingFinals: [],
          // The committed message carries its own copy of the sources; the
          // live-turn buffer is done with.
          streamingSources: [],
        });
      },

      clearStreamingResponse: () =>
        set({
          isStreamingResponse: false,
          streamingContent: '',
          streamingSteps: [],
          pendingFinals: [],
          streamingSources: [],
        }),

      setStreamingSources: (sources) => set({ streamingSources: sources }),

      openSourceDrawer: (sources, citation) =>
        set({ sourceDrawer: { sources, activeCitation: citation ?? null } }),

      closeSourceDrawer: () => set({ sourceDrawer: null }),

      setAvatarStream: (stream) => set({ avatarStream: stream }),
      setAvatarStatus: (status) => set({ avatarStatus: status }),
      setAvatarSpeaking: (speaking) => set({ avatarSpeaking: speaking }),

      setActiveModeSession: (v) => set({ activeModeSession: v }),
      setIsStartingModeSession: (v) => set({ isStartingModeSession: v }),
      setIsSwitchingMode: (v) => set({ isSwitchingMode: v }),
      updateActiveModeSession: (updates) =>
        set((state) =>
          state.activeModeSession
            ? { activeModeSession: { ...state.activeModeSession, ...updates } }
            : {}
        ),

      // Legacy aliases
      get conversations() { return get().sessions; },
      get currentConversationId() { return get().currentSessionId; },
      setCurrentConversation: (id) => get().setCurrentSession(id),
      addConversation: (s) => set((state) => ({ sessions: [s, ...state.sessions] })),
      deleteConversation: (id) => get().deleteSession(id),
      setConversations: (sessions) => set({ sessions }),
    }),
    {
      name: 'meraki-chat-store',
      // ✅ Fix #1: persist activeModeSession so page refresh restores mid-session state
      partialize: (state) => ({
        sessions: state.sessions,
        activeModeSession: state.activeModeSession,
      }),
    }
  )
);
