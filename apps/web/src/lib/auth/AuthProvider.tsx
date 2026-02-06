import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getStoredUser,
  setStoredUser,
  type AuthUser,
} from './auth.store';
import { apiClient } from '@/lib/api/client';

// Check if Clerk is enabled via env var
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Log for debugging
console.log('[AuthProvider] CLERK_ENABLED:', CLERK_ENABLED, 'Key:', import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.substring(0, 10) + '...');

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

// Wrapper component for Clerk mode
function ClerkAuthProvider({ children }: AuthProviderProps) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Sync Clerk state to local state
  useEffect(() => {
    const syncClerk = async () => {
      if (!clerkAuth.isLoaded || !clerkUser.isLoaded) return;

      console.log('[ClerkAuthProvider] Syncing...', {
        userId: clerkAuth.userId,
        orgId: clerkAuth.orgId,
        user: clerkUser.user?.fullName
      });

      if (clerkAuth.userId && clerkUser.user) {
        try {
          // Get JWT token from Clerk
          const jwt = await clerkAuth.getToken();
          setToken(jwt);

          // Map Clerk user to AuthUser
          // Note: orgId might be null if user hasn't selected an org
          const mappedUser: AuthUser = {
            userId: clerkAuth.userId,
            tenantId: clerkAuth.orgId || 'default', // Fallback for users without org
            email: clerkUser.user.primaryEmailAddress?.emailAddress || '',
            name: clerkUser.user.fullName || '',
            role: (clerkUser.user.publicMetadata?.role as string) || 'member',
            permissions: (clerkUser.user.publicMetadata?.permissions as string[]) || [],
          };

          setUser(mappedUser);
          console.log('[ClerkAuthProvider] User synced:', mappedUser.email);
        } catch (err) {
          console.error('[ClerkAuthProvider] Failed to sync:', err);
          setToken(null);
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    };

    syncClerk();
  }, [clerkAuth.userId, clerkAuth.orgId, clerkUser.user, clerkAuth.isLoaded, clerkUser.isLoaded, clerkAuth.getToken]);

  const logout = useCallback(() => {
    clerkAuth.signOut();
    setToken(null);
    setUser(null);
    clearStoredToken();
  }, [clerkAuth]);

  const login = useCallback(async () => {
    // Clerk handles login via its own UI
    window.location.href = '/sign-in';
  }, []);

  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user]
  );

  const isLoading = !clerkAuth.isLoaded || !clerkUser.isLoaded;

  const value: AuthContextValue = useMemo(() => ({
    token,
    user,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    hasPermission,
  }), [token, user, isLoading, login, logout, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Wrapper component for Dev mode
function DevAuthProvider({ children }: AuthProviderProps) {
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
      refreshUser(storedToken).catch(() => {
        logout();
      });
    }
    setIsLoading(false);
  }, []);

  const refreshUser = async (authToken: string) => {
    const response = await apiClient.get('/me', authToken);
    if (response.ok) {
      const data = response.data as any;
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
      if (!response.ok) throw new Error(response.error || 'Login failed');

      const { token: newToken } = response.data as { token: string };
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
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user]
  );

  const value: AuthContextValue = useMemo(() => ({
    token,
    user,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    hasPermission,
  }), [token, user, isLoading, login, logout, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Main export - chooses the right provider based on env
export function AuthProvider({ children }: AuthProviderProps) {
  if (CLERK_ENABLED) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }
  return <DevAuthProvider>{children}</DevAuthProvider>;
}
