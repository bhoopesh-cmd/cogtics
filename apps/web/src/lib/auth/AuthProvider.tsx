import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getStoredUser,
  setStoredUser,
  type AuthUser,
} from './auth.store';
import { apiClient } from '@/lib/api/client';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tenantId: string, userId: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth on mount
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      // Refresh user data from /me
      refreshUser(storedToken).catch(() => {
        // Token invalid, clear
        logout();
      });
    }
    setIsLoading(false);
  }, []);

  const refreshUser = async (authToken: string) => {
    const response = await apiClient.get('/me', authToken);
    if (response.ok) {
      const data = response.data as {
        userId: string;
        tenantId: string;
        email: string;
        name: string;
        role: string;
        permissions: string[];
      };
      const authUser: AuthUser = {
        userId: data.userId,
        tenantId: data.tenantId,
        email: data.email,
        name: data.name,
        role: data.role,
        permissions: data.permissions,
      };
      setUser(authUser);
      setStoredUser(authUser);
    } else {
      throw new Error('Failed to fetch user');
    }
  };

  const login = useCallback(async (tenantId: string, userId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/dev-token', { tenantId, userId });
      if (!response.ok) {
        throw new Error(response.error || 'Login failed');
      }

      const { token: newToken } = response.data as { token: string; expiresAt: string };
      setToken(newToken);
      setStoredToken(newToken);

      await refreshUser(newToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearStoredToken();
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      return user?.permissions.includes(permission) ?? false;
    },
    [user]
  );

  const value: AuthContextValue = {
    token,
    user,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

