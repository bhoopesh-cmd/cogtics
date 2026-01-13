import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { NoiseOverlay } from '@/components/ui/NoiseOverlay';
import { AbstractVisual } from '@/components/ui/AbstractVisual';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-black min-h-screen text-zinc-300 font-inter overflow-hidden">
      {/* Background effects */}
      <NoiseOverlay />
      <div className="fixed inset-0 z-0 opacity-30">
        <AbstractVisual />
      </div>

      <div className="flex relative z-10">
        {/* Sidebar navigation */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 ml-64 relative bg-black/50 min-h-screen overflow-y-auto">
          <div className="p-8 md:p-12 pb-32 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

