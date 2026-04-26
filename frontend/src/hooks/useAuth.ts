/**
 * Custom hook for authentication-related operations.
 */

import { useState, useCallback, useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { User, UserProfile } from '@/types/auth';

interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  profile: UserProfile | null;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(user && token);

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUser = await authService.getCurrentUser();
      const userProfile = await authService.getProfile();

      setUser(currentUser);
      setProfile(userProfile);
    } catch (err) {
      setError('Failed to refresh user data');
      console.error('Auth refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    // Load token from localStorage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Listen for auth changes from other components
    const handleAuthChange = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      setToken(storedToken);

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('speechcoach-auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('speechcoach-auth-change', handleAuthChange);
    };
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    profile,
    refreshUser,
    logout,
  };
}
