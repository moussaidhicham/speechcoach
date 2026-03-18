import api from '@/lib/api';
import { AuthResponse, User, UserProfile } from '@/types/auth';

export const authService = {
  async login(params: URLSearchParams): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/jwt/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  async register(userData: any): Promise<void> {
    await api.post('/auth/register', userData);
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<User>('/authenticated-route');
    return data;
  },

  async getProfile(): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>('/user/profile');
    return data;
  },

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const { data } = await api.patch<UserProfile>('/user/profile', profileData);
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};
