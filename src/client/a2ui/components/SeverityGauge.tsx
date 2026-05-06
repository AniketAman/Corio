import type { ReactNode } from 'react';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface SeverityGaugeProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

export function SeverityGauge({
  component,
  children,
  onAction: _onAction,
}: SeverityGaugeProps): ReactNode {
  const { score, label } = component as A2UIComponent & {
    score?: number;
    label?: string;
  };

  const value = Math.max(0, Math.min(100, score ?? 0));

  const getColor = (s: number): string => {
    if (s <= 40) return 'var(--color-danger)';
    if (s <= 70) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const color = getColor(value);

  // SVG circle parameters
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      {/* Score in center - overlay */}
      <div className="relative -mt-[68px] mb-[28px] flex items-center justify-center w-[100px] h-[40px]">
        <span className="text-2xl font-bold text-text-primary">{value}</span>
      </div>
      {label && (
        <span className="text-xs text-text-muted uppercase tracking-wider">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
