import React from 'react';

export function AbstractVisual() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-zinc-800/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
    </div>
  );
}

