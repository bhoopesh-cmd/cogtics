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
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

