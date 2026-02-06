import React, { useState, useEffect } from 'react';
import Logo from '@/components/ui/Logo';

const BACKGROUNDS = [
    '/bg-1.png', // Datacenter
    '/bg-2.png', // Network
    '/bg-3.png', // City
];

interface AuthLayoutProps {
    children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    const [bgIndex, setBgIndex] = useState(0);

    // Background rotation logic
    useEffect(() => {
        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
        }, 8000); // Rotate every 8 seconds
        return () => clearInterval(interval);
    }, []);

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

                {children}

                <p className="mt-8 text-xs text-zinc-500 text-center font-medium tracking-wide">
                    Revenue Command Center &copy; 2026
                </p>
            </div>
        </div>
    );
}
