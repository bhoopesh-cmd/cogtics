const TOKEN_KEY = 'cogtics_token';
const USER_KEY = 'cogtics_user';

export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // localStorage not available (incognito mode, storage blocked, etc.)
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage not available
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // localStorage not available
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    return JSON.parse(data) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage not available
  }
}

