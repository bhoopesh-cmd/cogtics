import React from 'react';
import type { IssueSeverity } from '@/lib/api/endpoints';

interface SeverityBadgeProps {
  severity: IssueSeverity;
}

const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500/20 text-red-400' },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-400' },
  medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400' },
  low: { label: 'Low', color: 'bg-blue-500/20 text-blue-400' },
  info: { label: 'Info', color: 'bg-zinc-500/20 text-zinc-400' },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label.toUpperCase()}
    </span>
  );
}
