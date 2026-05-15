export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number; // milliseconds
  duration: number;
  volume: number;
  isFullscreen: boolean;
}

export interface SubtitleTrack {
  id: string;
  start: number; // milliseconds
  end: number; // milliseconds
  text: string;
  speaker?: string;
}

export interface VideoStreamOptions {
  autoPlay?: boolean;
  muted?: boolean;
  showSubtitles?: boolean;
  playbackRate?: number;
}

export interface StreamingResponse {
  videoUrl: string;
  hlsUrl?: string; // HLS stream URL for progressive loading
  subtitlesUrl: string; // WebVTT subtitle URL
  format: 'hls' | 'mp4';
  contentType: string;
}
