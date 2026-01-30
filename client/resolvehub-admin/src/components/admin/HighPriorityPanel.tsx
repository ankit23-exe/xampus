import { TrendingUp, ThumbsUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface HighPriorityComplaint {
  id: string;
  rank: number;
  title: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  upvotes: number;
}

interface HighPriorityPanelProps {
  complaints: HighPriorityComplaint[];
  onView?: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  Water: 'border-l-blue-500',
  Electrical: 'border-l-red-500',
  Road: 'border-l-amber-500',
  Sanitation: 'border-l-green-500',
  Security: 'border-l-purple-500',
  Other: 'border-l-gray-500',
};

const statusBadgeClasses: Record<string, string> = {
  pending: 'status-pending',
  in_progress: 'status-in-progress',
  resolved: 'status-resolved',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export function HighPriorityPanel({ complaints, onView }: HighPriorityPanelProps) {
  return (
    <div className="panel-emphasis">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
          <TrendingUp className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">High Priority Complaints</h3>
          <p className="text-xs text-muted-foreground">Based on community upvotes</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {complaints.map((complaint) => (
          <div
            key={complaint.id}
            className={cn(
              'group flex items-center gap-4 rounded-lg border-l-4 bg-card p-4 transition-all hover:shadow-md',
              categoryColors[complaint.category] || categoryColors.Other
            )}
          >
            <div className={cn('priority-rank', `priority-${complaint.rank}`)}>
              #{complaint.rank}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground truncate">
                {complaint.title}
              </h4>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{complaint.category}</span>
                <span className="text-muted-foreground">•</span>
                <span className={cn('status-badge', statusBadgeClasses[complaint.status])}>
                  {statusLabels[complaint.status]}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-sm font-medium">{complaint.upvotes}</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onView?.(complaint.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
