'use client';

import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_EVENT = 'speechcoach-auth-change';
const EMPTY_AUTH_STATE = { user: null, token: null } as const;

let cachedToken: string | null = null;
let cachedUser: string | null = null;
let cachedAuthState: { user: User | null; token: string | null } = EMPTY_AUTH_STATE;

function readStoredAuth(): { user: User | null; token: string | null } {
  if (typeof window === 'undefined') {
    return EMPTY_AUTH_STATE;
  }

  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (token === cachedToken && storedUser === cachedUser) {
    return cachedAuthState;
  }

  if (!token || !storedUser) {
    cachedToken = token;
    cachedUser = storedUser;
    cachedAuthState = EMPTY_AUTH_STATE;
    return cachedAuthState;
  }

  try {
    cachedToken = token;
    cachedUser = storedUser;
    cachedAuthState = {
      token,
      user: JSON.parse(storedUser) as User,
    };
    return cachedAuthState;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    cachedToken = null;
    cachedUser = null;
    cachedAuthState = EMPTY_AUTH_STATE;
    return cachedAuthState;
  }
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const notify = () => callback();
  window.addEventListener('storage', notify);
  window.addEventListener(AUTH_EVENT, notify);

  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(AUTH_EVENT, notify);
  };
}

function notifyAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = React.useState(false);
  const authState = useSyncExternalStore(
    subscribe,
    readStoredAuth,
    () => EMPTY_AUTH_STATE
  );

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    notifyAuthChanged();
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    notifyAuthChanged();
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        login,
        logout,
        isLoading: !isHydrated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
