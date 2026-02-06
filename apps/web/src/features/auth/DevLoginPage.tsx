import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/lib/auth/useAuth';
import Logo from '@/components/ui/Logo';

// Check if Clerk is enabled
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const BACKGROUNDS = [
  '/bg-1.png', // Datacenter
  '/bg-2.png', // Network
  '/bg-3.png', // City
];

const DEV_USERS = [
  { userId: 'user_01', tenantId: 'tenant_01', label: 'Admin User', role: 'Admin' },
  { userId: 'user_02', tenantId: 'tenant_01', label: 'CFO User', role: 'CFO' },
  { userId: 'user_03', tenantId: 'tenant_01', label: 'Analyst User', role: 'Analyst' },
];

export function DevLoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [bgIndex, setBgIndex] = useState(0);

  // Background rotation logic
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
    }, 8000); // Rotate every 8 seconds
    return () => clearInterval(interval);
  }, []);

  // If Clerk is enabled, check if already signed in
  const clerkAuth = CLERK_ENABLED ? useClerkAuth() : null;

  // If user is already authenticated, redirect to home
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    if (CLERK_ENABLED && clerkAuth?.isSignedIn && !isAuthenticated) {
      console.log('[DevLoginPage] Clerk signed in, but app not authenticated. Check org selection.');
    }
  }, [clerkAuth?.isSignedIn, isAuthenticated]);

  const handleDevLogin = async (userId: string, tenantId: string) => {
    setError(null);
    try {
      await login(tenantId, userId);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen relative bg-black flex items-center justify-center p-4 overflow-hidden">
      {/* Background Slideshow */}
      {BACKGROUNDS.map((bg, index) => (
        <div
          key={bg}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out`}
          style={{
            backgroundImage: `url(${bg})`,
            opacity: index === bgIndex ? 0.4 : 0, // Low opacity for text legibility
            zIndex: 0
          }}
        />
      ))}

      {/* Overlay for consistency */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/80 z-[1]" />

      {/* Main Content */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        <div className="text-center mb-10 w-full">
          <div className="flex justify-center mb-6">
            <Logo size={42} />
          </div>
        </div>

        {CLERK_ENABLED ? (
          // Clerk Login
          <div className="flex justify-center">
            <SignIn
              appearance={{
                layout: {
                  socialButtonsPlacement: 'bottom',
                  socialButtonsVariant: 'blockButton',
                },
                variables: {
                  colorPrimary: '#ffffff',
                  colorText: '#ffffff',
                  colorTextSecondary: '#a1a1aa', // zinc-400
                  colorBackground: 'rgba(24, 24, 27, 0.6)', // zinc-900 with opacity
                  colorInputBackground: 'rgba(39, 39, 42, 0.8)', // zinc-800 with opacity
                  colorInputText: '#ffffff',
                  borderRadius: '0.75rem',
                },
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-zinc-900/60 backdrop-blur-md border border-white/10 shadow-2xl p-8 rounded-xl',
                  headerTitle: 'text-white text-xl font-medium',
                  headerSubtitle: 'text-zinc-400',

                  // Inputs
                  formFieldLabel: 'text-zinc-400 text-xs uppercase tracking-wider font-medium',
                  formFieldInput: 'bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-white/40 focus:ring-white/10 transition-all',

                  // Primary Button
                  formButtonPrimary: 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5 border-none font-medium text-sm h-10 normal-case tracking-normal transition-all',

                  // Social Buttons
                  socialButtonsBlockButton: 'bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all',

                  // Footer with Sign Up link
                  footer: 'mt-4',
                  footerAction: 'text-zinc-400',
                  footerActionLink: 'text-white hover:text-orange-400 font-medium transition-colors',
                  dividerLine: 'bg-white/10',
                  dividerText: 'text-zinc-500 bg-transparent',
                }
              }}
              signUpUrl="/sign-up"
              afterSignInUrl="/"
            />
          </div>
        ) : (
          // Dev Login
          <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-xl p-8 shadow-2xl w-full">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono">
                Development Access
              </span>
            </div>

            <h2 className="text-sm font-medium text-white mb-4">Select Persona</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              {DEV_USERS.map((user) => (
                <button
                  key={user.userId}
                  onClick={() => handleDevLogin(user.userId, user.tenantId)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm group"
                >
                  <div className="text-left">
                    <div className="text-white font-medium group-hover:translate-x-1 transition-transform">{user.label}</div>
                    <div className="text-xs text-zinc-500 group-hover:text-zinc-400">{user.userId}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-white/5 text-zinc-300 rounded border border-white/5 group-hover:border-white/20 transition-colors">
                    {user.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-xs text-zinc-500 text-center font-medium tracking-wide">
          Revenue Command Center &copy; 2026
        </p>
      </div>
    </div>
  );
}
