export interface User {
  id: string;
  email: string;
  role?: string;
  /**
   * Kept in the store so the header shows a name without a round trip.
   *
   * Nullable, not just optional: GET /users/me returns null for an account
   * that has never filled these in (a Google sign-up has no first name), and
   * every caller assigns that response straight into this type.
   */
  first_name?: string | null;
  last_name?: string | null;
  university_name?: string | null;
  profile_picture_url?: string | null;
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