import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { MetricCard } from './MetricCard';

interface ComplaintSummaryProps {
  total: number;
  resolved: number;
  pending: number;
  highPriority: number;
}

export function ComplaintSummaryCards({ 
  total, 
  resolved, 
  pending, 
  highPriority 
}: ComplaintSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
      <MetricCard
        title="Total Complaints"
        value={total}
        icon={FileText}
        variant="blue"
        subtitle="Total"
      />
      <MetricCard
        title="Resolved"
        value={resolved}
        icon={CheckCircle}
        variant="green"
        subtitle="✓ Done"
      />
      <MetricCard
        title="Pending"
        value={pending}
        icon={Clock}
        variant="amber"
        subtitle="⏳ Active"
      />
      <MetricCard
        title="High Priority"
        value={highPriority}
        icon={TrendingUp}
        variant="red"
        subtitle="50+ upvotes"
      />
    </div>
  );
}
