import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, ThumbsUp, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  upvoteCount: number;
  upvotedBy: string[];
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function StudentIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic'
  });

  const categories = [
    { label: 'Academic', value: 'academic' },
    { label: 'Infrastructure', value: 'infrastructure' },
    { label: 'Hostel', value: 'hostel' },
    { label: 'Safety', value: 'safety' },
    { label: 'Transport', value: 'transport' },
    { label: 'Cleanliness', value: 'cleanliness' },
    { label: 'Other', value: 'other' }
  ];

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/issues`);
      setIssues(response.data.complaints || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('student_token');
      await axios.post(`${API_URL}/api/issues`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Issue created successfully');
      setDialogOpen(false);
      setFormData({ title: '', description: '', category: 'academic' });
      fetchIssues();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create issue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (issueId: string) => {
    try {
      const token = localStorage.getItem('student_token');
      await axios.post(`${API_URL}/api/issues/${issueId}/upvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Vote updated');
      fetchIssues();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to vote');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      open: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const hasUserUpvoted = (issue: Issue) => {
    const user = JSON.parse(localStorage.getItem('student_user') || '{}');
    return issue.upvotedBy?.includes(user.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Campus Issues</h2>
          <p className="text-muted-foreground">Report issues and upvote existing ones</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Report New Issue</DialogTitle>
                <DialogDescription>
                  Describe the issue you're facing. Other students can upvote to show support.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide more details about the issue"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    disabled={submitting}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Submitting...' : 'Submit Issue'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No issues reported yet. Be the first to report one!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {issues.map((issue) => (
            <Card key={issue._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{issue.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Reported by {issue.createdBy?.name || 'Anonymous'} • {new Date(issue.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(issue.status)}
                    <Badge variant="outline">{issue.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{issue.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <Button
                  variant={hasUserUpvoted(issue) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleUpvote(issue._id)}
                  className="gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  {issue.upvoteCount || 0} {hasUserUpvoted(issue) ? 'Upvoted' : 'Upvote'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
