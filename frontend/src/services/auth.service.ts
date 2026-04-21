import api from '@/lib/api';
import { AuthResponse, User, UserProfile } from '@/types/auth';

interface RegisterPayload {
  email: string;
  password: string;
}

function notifyAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('speechcoach-auth-change'));
  }
}

export const authService = {
  async login(params: URLSearchParams): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/jwt/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  async register(userData: RegisterPayload): Promise<void> {
    await api.post('/auth/register', userData);
  },

  async getCurrentUser(): Promise<User> {
    try {
      const { data } = await api.get<User>('/auth/me');
      return data;
    } catch (error: unknown) {
      const status =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { status?: number } }).response?.status === 'number'
          ? (error as { response?: { status?: number } }).response?.status
          : null;

      if (status === 404) {
        const { data } = await api.get<User>('/auth/users/me');
        return data;
      }

      throw error;
    }
  },

  async getProfile(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>('/user/profile');
    return data;
  },

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const { data } = await api.patch<UserProfile>('/user/profile', profileData);
    return data;
  },

  async deleteAccount(): Promise<void> {
    await api.delete('/user/account');
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(password: string, token: string): Promise<void> {
    await api.post('/auth/reset-password', { password, token });
  },

  async verifyEmail(token: string): Promise<{ access_token: string; user: User }> {
    const { data } = await api.post('/auth/verify', { token });
    return data;
  },

  async requestVerification(email: string): Promise<void> {
    await api.post('/auth/request-verify', { email });
  },

  async getStatus(): Promise<User & { is_verified: boolean }> {
    const { data } = await api.get('/auth/status');
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    notifyAuthChanged();
    window.location.href = '/login';
  },
};
