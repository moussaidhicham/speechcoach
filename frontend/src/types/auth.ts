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
  full_name?: string;
  preferred_language: string;
  experience_level?: string;
  current_goal?: string;
  weak_points?: string;
  avatar_url?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
