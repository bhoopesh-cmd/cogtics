import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/lib/auth/useAuth';
import Logo from '@/components/ui/Logo';

// Check if Clerk is enabled
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const BACKGROUNDS = [
    '/bg-1.png', // Datacenter
    '/bg-2.png', // Network
    '/bg-3.png', // City
];

export function SignUpPage() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [bgIndex, setBgIndex] = useState(0);

    // Background rotation logic
    useEffect(() => {
        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
        }, 8000); // Rotate every 8 seconds
        return () => clearInterval(interval);
    }, []);

    const clerkAuth = CLERK_ENABLED ? useClerkAuth() : null;

    // If user is already authenticated, redirect to home
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    if (!CLERK_ENABLED) {
        useEffect(() => { navigate('/login'); }, [navigate]);
        return null;
    }

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

                <div className="flex justify-center">
                    <SignUp
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

                                // Footer
                                footer: 'mt-4',
                                footerAction: 'text-zinc-400',
                                footerActionLink: 'text-white hover:text-orange-400 font-medium transition-colors',
                                dividerLine: 'bg-white/10',
                                dividerText: 'text-zinc-500 bg-transparent',
                            }
                        }}
                        signInUrl="/login"
                        afterSignUpUrl="/"
                    />
                </div>

                <p className="mt-8 text-xs text-zinc-500 text-center font-medium tracking-wide">
                    Revenue Command Center &copy; 2026
                </p>
            </div>
        </div>
    );
}
