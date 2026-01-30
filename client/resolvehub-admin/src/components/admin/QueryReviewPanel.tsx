import { HelpCircle, ExternalLink, Globe, TrendingUp, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UnresolvedQuery {
  id: string;
  question: string;
  language: string;
  timesAsked: number;
  lastAsked: string;
  confidence: number;
  status: 'needs_attention' | 'unresolved';
}

interface QueryReviewPanelProps {
  queries: UnresolvedQuery[];
  pendingCount: number;
  onReview?: (id: string) => void;
  onAddToKnowledge?: (id: string) => void;
}

export function QueryReviewPanel({ 
  queries, 
  pendingCount, 
  onReview,
  onAddToKnowledge 
}: QueryReviewPanelProps) {
  const getConfidenceClass = (confidence: number) => {
    if (confidence < 30) return 'confidence-low';
    if (confidence < 60) return 'confidence-medium';
    return 'confidence-high';
  };

  const getStatusBadge = (status: UnresolvedQuery['status']) => {
    if (status === 'needs_attention') {
      return (
        <span className="status-badge status-attention">
          <AlertCircle className="h-3 w-3" />
          Needs Attention
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
        Unresolved
      </span>
    );
  };

  return (
    <div className="panel h-fit">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Query Review</h3>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Unresolved Queries</p>
            <p className="text-xs text-muted-foreground">
              Questions the chatbot couldn't answer confidently
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-semibold text-accent">{pendingCount}</span>
            <p className="text-xs text-muted-foreground">pending</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {queries.map((query) => (
          <div
            key={query.id}
            className="group rounded-lg border bg-card p-4 transition-all hover:border-accent/30 hover:shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-foreground leading-snug">
                {query.question}
              </h4>
              {getStatusBadge(query.status)}
            </div>
            
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {query.language}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Asked {query.timesAsked} times
              </span>
            </div>
            
            <p className="mb-3 text-xs text-muted-foreground">
              Last: {query.lastAsked}
            </p>
            
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Bot Confidence</span>
                <span className={cn(
                  'font-medium',
                  query.confidence < 30 ? 'text-status-error' : 
                  query.confidence < 60 ? 'text-status-warning' : 'text-status-success'
                )}>
                  {query.confidence}%
                </span>
              </div>
              <div className="confidence-bar mt-1.5">
                <div 
                  className={cn('confidence-fill', getConfidenceClass(query.confidence))}
                  style={{ width: `${query.confidence}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => onAddToKnowledge?.(query.id)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add to KB
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => onReview?.(query.id)}
              >
                Review
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
