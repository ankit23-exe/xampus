import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ComplaintSummaryCards } from '@/components/admin/ComplaintSummaryCards';
import { HighPriorityPanel, HighPriorityComplaint } from '@/components/admin/HighPriorityPanel';
import { ComplaintsList, Complaint } from '@/components/admin/ComplaintsList';
import { ComplaintDetailModal, ComplaintDetail } from '@/components/admin/ComplaintDetailModal';
import { issuesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Status mapping
const statusMap: Record<string, 'pending' | 'in_progress' | 'resolved'> = {
  'open': 'pending',
  'in_progress': 'in_progress',
  'resolved': 'resolved',
};

export default function CampusComplaints() {
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await issuesAPI.getAdminIssues();
      
      // Map backend data to frontend format
      const complaintsData = Array.isArray(response.data.complaints) ? response.data.complaints : [];
      const mappedComplaints: Complaint[] = complaintsData.map((issue: any) => ({
        id: issue._id,
        title: issue.title,
        category: issue.category || 'Other',
        status: statusMap[issue.status] || 'pending',
        upvotes: issue.upvoteCount,
        createdAt: new Date(issue.createdAt).toISOString().split('T')[0],
      }));

      setComplaints(mappedComplaints);
    } catch (error: any) {
      console.error('Error fetching complaints:', error);
      toast.error('Failed to load complaints');
      setComplaints([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleViewComplaint = async (id: string) => {
    try {
      const response = await issuesAPI.getIssueById(id);
      const issue = response.data.complaint;
      
      const detail: ComplaintDetail = {
        id: issue._id,
        title: issue.title,
        description: issue.description,
        category: issue.category || 'Other',
        status: statusMap[issue.status] || 'pending',
        upvotes: issue.upvoteCount,
        createdAt: new Date(issue.createdAt).toISOString().split('T')[0],
        location: 'Campus', // Backend doesn't have location yet
        reportedBy: issue.createdBy?.name || 'Anonymous',
        imageUrl: issue.imageUrl,
      };
      
      setSelectedComplaint(detail);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching complaint details:', error);
      toast.error('Failed to load complaint details');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: Complaint['status']) => {
    try {
      // Map frontend status back to backend status
      const backendStatus = newStatus === 'pending' ? 'open' : newStatus;
      
      await issuesAPI.updateIssueStatus(id, backendStatus as any);
      
      setComplaints(complaints.map(c => 
        c.id === id ? { ...c, status: newStatus } : c
      ));
      
      toast.success('Status updated successfully');
      fetchComplaints(); // Refresh data
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalComplaints = Array.isArray(complaints) ? complaints.length : 0;
  const resolvedComplaints = Array.isArray(complaints) ? complaints.filter(c => c.status === 'resolved').length : 0;
  const pendingComplaints = Array.isArray(complaints) ? complaints.filter(c => c.status === 'pending').length : 0;
  const highPriorityCount = Array.isArray(complaints) ? complaints.filter(c => c.upvotes >= 20).length : 0;

  // Get high priority complaints (top 3 by upvotes, excluding resolved)
  const highPriorityComplaints: HighPriorityComplaint[] = Array.isArray(complaints)
    ? complaints
        .filter(c => c.status !== 'resolved')
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, 3)
        .map((c, index) => ({
          id: c.id,
          rank: index + 1,
          title: c.title,
          category: c.category,
          status: c.status,
          upvotes: c.upvotes,
        }))
    : [];

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Campus Complaints" 
        subtitle="Track and resolve campus-wide complaints" 
      />
      
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <ComplaintSummaryCards
          total={totalComplaints}
          resolved={resolvedComplaints}
          pending={pendingComplaints}
          highPriority={highPriorityCount}
        />
        
        {/* High Priority Panel */}
        <HighPriorityPanel
          complaints={highPriorityComplaints}
          onView={handleViewComplaint}
        />
        
        {/* Complaints List */}
        <ComplaintsList
          complaints={complaints}
          onView={handleViewComplaint}
          onUpdateStatus={handleUpdateStatus}
        />
      </div>
      
      {/* Detail Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
