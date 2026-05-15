import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UIState {
  sidebarOpen: boolean;
  showSubtitles: boolean;
  isRecording: boolean;
  recordingDuration: number;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setShowSubtitles: (show: boolean) => void;
  setIsRecording: (recording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      showSubtitles: true,
      isRecording: false,
      recordingDuration: 0,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setShowSubtitles: (show) => set({ showSubtitles: show }),
      setIsRecording: (recording) => set({ isRecording: recording }),
      setRecordingDuration: (duration) => set({ recordingDuration: duration }),
    }),
    {
      name: 'meraki-ui-store',
      partialize: (s) => ({ sidebarOpen: s.sidebarOpen, showSubtitles: s.showSubtitles }),
    }
  )
);