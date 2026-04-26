import api from '@/lib/api';
import { AUTH_ENDPOINTS, USER_ENDPOINTS } from '@/constants/api';
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
    const { data } = await api.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  async register(userData: RegisterPayload): Promise<void> {
    await api.post(AUTH_ENDPOINTS.REGISTER, userData);
  },

  async getCurrentUser(): Promise<User> {
    try {
      const { data } = await api.get<User>(AUTH_ENDPOINTS.ME);
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
        const { data } = await api.get<User>(AUTH_ENDPOINTS.USERS_ME);
        return data;
      }

      throw error;
    }
  },

  async getProfile(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>(USER_ENDPOINTS.PROFILE);
    return data;
  },

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const { data } = await api.patch<UserProfile>(USER_ENDPOINTS.PROFILE, profileData);
    return data;
  },

  async deleteAccount(): Promise<void> {
    await api.delete(USER_ENDPOINTS.ACCOUNT);
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });
  },

  async resetPassword(password: string, token: string): Promise<void> {
    await api.post(AUTH_ENDPOINTS.RESET_PASSWORD, { password, token });
  },

  async verifyEmail(token: string): Promise<{ access_token: string; user: User }> {
    const { data } = await api.post(AUTH_ENDPOINTS.VERIFY, { token });
    return data;
  },

  async requestVerification(email: string): Promise<void> {
    await api.post(AUTH_ENDPOINTS.REQUEST_VERIFY, { email });
  },

  async getStatus(): Promise<User & { is_verified: boolean }> {
    const { data } = await api.get(AUTH_ENDPOINTS.STATUS);
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    notifyAuthChanged();
    window.location.href = '/login';
  },
};
