import React from 'react';
import type { AIDiscoveryCategory } from '@/lib/api/endpoints';

interface CategoryBadgeProps {
  category: AIDiscoveryCategory;
}

const CATEGORY_CONFIG: Record<AIDiscoveryCategory, { label: string; color: string }> = {
  semantic: { label: 'Semantic', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  pattern: { label: 'Pattern', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  anomaly: { label: 'Anomaly', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  contextual: { label: 'Contextual', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.anomaly;
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}
