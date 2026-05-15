export interface User {
  id: string;
  email: string;
  role?: string;
  avatar_id?: string;
  avatar_provider?: string;
  avatar_gender?: 'male' | 'female';
  voice_provider?: string;
  voice_id?: string;
  voice_gender?: 'male' | 'female';
  created_at?: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: string;
  subtitlesEnabled: boolean;
  autoPlayVideo: boolean;
  prefersVideo: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}