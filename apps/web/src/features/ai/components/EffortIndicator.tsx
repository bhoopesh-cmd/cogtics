import React from 'react';
import type { RecommendationEffort } from '@/lib/api/endpoints';

interface EffortIndicatorProps {
  effort: RecommendationEffort;
}

const EFFORT_CONFIG: Record<RecommendationEffort, { label: string; dots: number; color: string }> = {
  low: { label: 'Low Effort', dots: 1, color: 'bg-green-500' },
  medium: { label: 'Medium Effort', dots: 2, color: 'bg-yellow-500' },
  high: { label: 'High Effort', dots: 3, color: 'bg-red-500' },
};

export function EffortIndicator({ effort }: EffortIndicatorProps) {
  const config = EFFORT_CONFIG[effort] || EFFORT_CONFIG.medium;
  
  return (
    <div className="flex items-center gap-2" title={config.label}>
      <div className="flex gap-1">
        {[1, 2, 3].map((dot) => (
          <div
            key={dot}
            className={`w-2 h-2 rounded-full ${
              dot <= config.dots ? config.color : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-zinc-500">{config.label}</span>
    </div>
  );
}
