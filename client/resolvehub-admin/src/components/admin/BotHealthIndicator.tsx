import { Bot, TrendingUp } from 'lucide-react';

interface BotHealthIndicatorProps {
  coverage: number;
}

export function BotHealthIndicator({ coverage }: BotHealthIndicatorProps) {
  const getHealthColor = () => {
    if (coverage >= 80) return 'text-status-success';
    if (coverage >= 60) return 'text-status-warning';
    return 'text-status-error';
  };

  return (
    <div className="panel-emphasis">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Bot Coverage Health</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4 text-status-success" />
          <span className={`text-lg font-semibold ${getHealthColor()}`}>
            {coverage}%
          </span>
        </div>
      </div>
      
      <div className="health-bar">
        <div 
          className="health-fill"
          style={{ width: `${coverage}%` }}
        />
      </div>
      
      <p className="mt-2 text-xs text-muted-foreground">
        {coverage}% of queries answered confidently by the chatbot
      </p>
    </div>
  );
}
