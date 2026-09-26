'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { DidStream } from '@/services/didStream';

/**
 * Owns the real-time D-ID avatar WebRTC connection for the active session.
 * Connects when the current session is in video mode; tears down on session
 * change or when video is turned off. Call ONCE (from ChatContainer) so there
 * is a single owner of the connection lifecycle.
 */
export function useAvatarStream() {
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const sessions = useChatStore((s) => s.sessions);
  const setAvatarStream = useChatStore((s) => s.setAvatarStream);
  const setAvatarStatus = useChatStore((s) => s.setAvatarStatus);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  // The D-ID agent is chosen from the avatar when the stream opens, so a switch
  // of avatar has to reopen it — otherwise the old tutor keeps answering.
  const avatarId = useUserStore((s) => s.user?.avatar_id);

  const session = sessions.find((s) => s.id === currentSessionId);
  // Only Learn mode supports video; Review (including scenarios) is text-only.
  const mode = session?.currentMode ?? session?.mode ?? 'learn';
  const prefersVideo = !!session?.prefersVideo && mode === 'learn';

  useEffect(() => {
    if (!currentSessionId || !isAuthenticated || !prefersVideo) {
      if (currentSessionId) DidStream.closeSession(currentSessionId);
      setAvatarStream(null);
      setAvatarStatus('off');
      return;
    }

    DidStream.getOrCreate({
      sessionId: currentSessionId,
      onStream: (stream) => setAvatarStream(stream),
      onStatus: (status) =>
        setAvatarStatus(status === 'closed' ? 'off' : status),
    });

    return () => {
      DidStream.closeSession(currentSessionId);
      setAvatarStream(null);
      setAvatarStatus('off');
    };
  }, [currentSessionId, prefersVideo, isAuthenticated, avatarId, setAvatarStream, setAvatarStatus]);
}
