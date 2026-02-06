import React from 'react';

interface ConfidenceBarProps {
  confidence: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConfidenceBar({ confidence, size = 'md', showLabel = true }: ConfidenceBarProps) {
  const percentage = Math.round(confidence * 100);
  
  const getColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${heights[size]} bg-zinc-800 rounded-full overflow-hidden`}>
        <div 
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-zinc-400 font-mono w-10 text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}
