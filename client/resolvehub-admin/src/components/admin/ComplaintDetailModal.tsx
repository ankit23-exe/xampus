import { X, ThumbsUp, Clock, Tag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface ComplaintDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  upvotes: number;
  createdAt: string;
  location?: string;
  reportedBy?: string;
  imageUrl?: string;
}

interface ComplaintDetailModalProps {
  complaint: ComplaintDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: ComplaintDetail['status']) => void;
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export function ComplaintDetailModal({ 
  complaint, 
  isOpen, 
  onClose, 
  onUpdateStatus 
}: ComplaintDetailModalProps) {
  const [adminNote, setAdminNote] = useState('');
  const [status, setStatus] = useState(complaint?.status || 'pending');

  if (!isOpen || !complaint) return null;

  const handleSave = () => {
    onUpdateStatus?.(complaint.id, status);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl bg-card shadow-xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Complaint Details</h2>
            <p className="text-xs text-muted-foreground">ID: {complaint.id}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {complaint.imageUrl && (
            <div className="rounded-lg overflow-hidden bg-muted border border-border">
              <img
                src={complaint.imageUrl}
                alt={complaint.title}
                className="w-full h-96 object-cover"
              />
            </div>
          )}
          
          <div>
            <h3 className="text-base font-medium text-foreground mb-1">{complaint.title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{complaint.description}</p>
          </div>
          
          {/* Upvotes highlight */}
          <div className="flex items-center gap-3 rounded-lg bg-accent/5 border border-accent/20 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <ThumbsUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{complaint.upvotes}</p>
              <p className="text-xs text-muted-foreground">Community upvotes</p>
            </div>
          </div>
          
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium text-foreground">{complaint.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reported</p>
                <p className="text-sm font-medium text-foreground">{complaint.createdAt}</p>
              </div>
            </div>
          </div>
          
          {/* Status update */}
          <div>
            <label className="text-sm font-medium text-foreground">Update Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as ComplaintDetail['status'])}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Admin note */}
          <div>
            <label className="text-sm font-medium text-foreground">Admin Note (Optional)</label>
            <Textarea
              className="mt-1.5"
              placeholder="Add an internal note about this complaint..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Microcopy */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Complaints are raised when the chatbot cannot fully resolve a student issue. 
              Updating this status helps track manual intervention effectiveness.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
