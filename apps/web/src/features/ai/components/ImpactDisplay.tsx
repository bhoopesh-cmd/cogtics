import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { EstimatedImpact } from '@/lib/api/endpoints';

interface ImpactDisplayProps {
  impact: EstimatedImpact;
  size?: 'sm' | 'md' | 'lg';
}

export function ImpactDisplay({ impact, size = 'md' }: ImpactDisplayProps) {
  const { revenueChange, currency = 'USD' } = impact;
  
  if (revenueChange === undefined || revenueChange === null) {
    return (
      <div className="flex items-center gap-1 text-zinc-500">
        <Minus size={14} />
        <span className="text-sm">Unknown impact</span>
      </div>
    );
  }

  const isPositive = revenueChange > 0;
  const isNegative = revenueChange < 0;
  const absValue = Math.abs(revenueChange);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <div className={`flex items-center gap-1 ${textSizes[size]} ${
      isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-zinc-400'
    }`}>
      {isPositive && <TrendingUp size={iconSizes[size]} />}
      {isNegative && <TrendingDown size={iconSizes[size]} />}
      {!isPositive && !isNegative && <Minus size={iconSizes[size]} />}
      <span>{isPositive ? '+' : ''}{formatCurrency(revenueChange)}</span>
    </div>
  );
}
