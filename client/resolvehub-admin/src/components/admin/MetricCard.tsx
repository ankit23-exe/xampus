import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  subtitle?: string;
  className?: string;
}

const variantStyles = {
  blue: {
    iconBg: 'bg-metric-blue-bg',
    iconColor: 'text-metric-blue',
    glow: 'hsl(217 91% 60% / 0.15)',
  },
  green: {
    iconBg: 'bg-metric-green-bg',
    iconColor: 'text-metric-green',
    glow: 'hsl(142 71% 45% / 0.15)',
  },
  amber: {
    iconBg: 'bg-metric-amber-bg',
    iconColor: 'text-metric-amber',
    glow: 'hsl(38 92% 50% / 0.15)',
  },
  red: {
    iconBg: 'bg-metric-red-bg',
    iconColor: 'text-metric-red',
    glow: 'hsl(0 84% 60% / 0.15)',
  },
  purple: {
    iconBg: 'bg-metric-purple-bg',
    iconColor: 'text-metric-purple',
    glow: 'hsl(262 83% 58% / 0.15)',
  },
};

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'blue',
  subtitle,
  className 
}: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <div 
      className={cn('metric-card group', className)}
      style={{ '--metric-glow': styles.glow } as React.CSSProperties}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn(
            'mt-1 text-3xl font-semibold tracking-tight',
            styles.iconColor
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <div className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
          styles.iconBg
        )}>
          <Icon className={cn('h-5 w-5', styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
