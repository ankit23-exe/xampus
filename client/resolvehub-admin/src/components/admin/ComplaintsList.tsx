import { useState } from 'react';
import { ThumbsUp, Eye, MoreHorizontal, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface Complaint {
  id: string;
  title: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  upvotes: number;
  createdAt: string;
}

interface ComplaintsListProps {
  complaints: Complaint[];
  onView?: (id: string) => void;
  onUpdateStatus?: (id: string, status: Complaint['status']) => void;
}

type FilterType = 'all' | 'high_priority' | 'pending' | 'resolved';

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

const categoryColors: Record<string, string> = {
  Water: 'bg-blue-100 text-blue-700',
  Electrical: 'bg-red-100 text-red-700',
  Road: 'bg-amber-100 text-amber-700',
  Sanitation: 'bg-green-100 text-green-700',
  Security: 'bg-purple-100 text-purple-700',
  Other: 'bg-gray-100 text-gray-700',
};

export function ComplaintsList({ complaints, onView, onUpdateStatus }: ComplaintsListProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredComplaints = complaints.filter((complaint) => {
    switch (filter) {
      case 'high_priority':
        return complaint.upvotes >= 50;
      case 'pending':
        return complaint.status === 'pending';
      case 'resolved':
        return complaint.status === 'resolved';
      default:
        return true;
    }
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'high_priority', label: 'High Priority' },
    { key: 'pending', label: 'Pending' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="panel">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-foreground">All Complaints</h3>
        
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn('filter-pill', filter === f.key && 'active')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-3">
        {filteredComplaints.map((complaint) => (
          <div
            key={complaint.id}
            className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:border-accent/30 hover:shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-2">
                <h4 className="text-sm font-medium text-foreground">{complaint.title}</h4>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Hash className="h-3 w-3" />
                  {complaint.id}
                </span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  categoryColors[complaint.category] || categoryColors.Other
                )}>
                  {complaint.category}
                </span>
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
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onView?.(complaint.id)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(complaint.id, 'pending')}>
                      Mark as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(complaint.id, 'in_progress')}>
                      Mark as In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus?.(complaint.id, 'resolved')}>
                      Mark as Resolved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
