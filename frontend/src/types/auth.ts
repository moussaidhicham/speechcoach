export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string | null;
  preferred_language: string;
  experience_level?: string | null;
  current_goal?: string | null;
  weak_points?: string | null;
  avatar_url?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
