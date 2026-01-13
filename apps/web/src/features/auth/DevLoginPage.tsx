import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/useAuth';
import Logo from '@/components/ui/Logo';

const DEV_USERS = [
  { userId: 'user_01', tenantId: 'tenant_01', label: 'Admin User', role: 'Admin' },
  { userId: 'user_02', tenantId: 'tenant_01', label: 'CFO User', role: 'CFO' },
  { userId: 'user_03', tenantId: 'tenant_01', label: 'Analyst User', role: 'Analyst' },
];

export function DevLoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (userId: string, tenantId: string) => {
    setError(null);
    try {
      await login(tenantId, userId);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Logo size={48} color="white" />
          </div>
          <p className="text-zinc-500 text-sm">Revenue Command Center</p>
        </div>

        {/* Dev login panel */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-yellow-500 font-mono">
              Development Mode
            </span>
          </div>

          <h2 className="text-lg font-medium text-white mb-4">Select User</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {DEV_USERS.map((user) => (
              <button
                key={user.userId}
                onClick={() => handleLogin(user.userId, user.tenantId)}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all disabled:opacity-50"
              >
                <div className="text-left">
                  <div className="text-white font-medium">{user.label}</div>
                  <div className="text-xs text-zinc-500">{user.userId}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded">{user.role}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-zinc-600 text-center">
            This login is for development only. Production will use JWT authentication.
          </p>
        </div>
      </div>
    </div>
  );
}

