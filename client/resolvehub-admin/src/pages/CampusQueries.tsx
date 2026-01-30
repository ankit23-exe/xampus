import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { UploadZone } from '@/components/admin/UploadZone';
import { FileList, UploadedFile } from '@/components/admin/FileList';
import { QueryReviewPanel, UnresolvedQuery } from '@/components/admin/QueryReviewPanel';
import { BotHealthIndicator } from '@/components/admin/BotHealthIndicator';
import { queryAPI, filesAPI } from '@/lib/api';
import { toast } from 'sonner';

export default function CampusQueries() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [queries, setQueries] = useState<UnresolvedQuery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [queriesRes, filesRes] = await Promise.all([
        queryAPI.getUnansweredQueries({ sortBy: 'askCount' }),
        filesAPI.getFiles().catch(() => ({ data: [] })), // Fallback if endpoint doesn't exist yet
      ]);

      // Map backend queries to frontend format
      const mappedQueries: UnresolvedQuery[] = queriesRes.data.queries.map((q: any) => ({
        id: q._id,
        question: q.normalizedQuestion,
        language: 'English', // Default for now
        timesAsked: q.askCount,
        lastAsked: new Date(q.lastAskedAt).toISOString().split('T')[0],
        confidence: 100 - q.askCount, // Lower confidence for highly asked questions
        status: q.askCount > 20 ? 'needs_attention' : 'unresolved',
      }));

      setQueries(mappedQueries);
      // Map backend file fields to frontend fields expected by FileList
      const filesData = Array.isArray(filesRes.data.files)
        ? filesRes.data.files.map((f: any) => ({
            id: f._id,
            name: f.filename || f.originalName,
            size: f.size ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
            uploadedAt: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '',
            status: f.status === 'completed' ? 'indexed' : 'processing',
          }))
        : [];
      setFiles(filesData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      // Set empty arrays on error to prevent filter issues
      setQueries([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await filesAPI.deleteFile(id);
      setFiles(files.filter(f => f.id !== id));
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleUpload = async (uploadedFiles: FileList) => {
    // Upload each file individually as backend expects 'file' field (not 'files')
    try {
      toast.info('Uploading files...');
      for (const file of Array.from(uploadedFiles)) {
        const formData = new FormData();
        formData.append('file', file); // Backend expects 'file'
        await filesAPI.uploadFile(formData);
      }
      toast.success('Files uploaded successfully');
      fetchData(); // Refresh file list
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    }
  };

  const handleMarkAsResolved = async (id: string) => {
    try {
      await queryAPI.markQueryAsAnswered(id);
      setQueries(queries.filter(q => q.id !== id));
      toast.success('Query marked as resolved');
    } catch (error) {
      console.error('Error marking query as resolved:', error);
      toast.error('Failed to mark query as resolved');
    }
  };

  const totalFiles = Array.isArray(files) ? files.length : 0;
  const indexedFiles = Array.isArray(files) ? files.filter(f => f.status === 'indexed').length : 0;
  const processingFiles = Array.isArray(files) ? files.filter(f => f.status === 'processing').length : 0;
  const needsAttention = Array.isArray(queries) ? queries.filter(q => q.status === 'needs_attention').length : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminHeader 
        title="Campus Queries" 
        subtitle="Manage chatbot knowledge base and review unresolved queries" 
      />
      
      <div className="p-6 space-y-6">
        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          <MetricCard
            title="Total Files"
            value={totalFiles}
            icon={FileText}
            variant="blue"
          />
          <MetricCard
            title="Indexed"
            value={indexedFiles}
            icon={CheckCircle}
            variant="green"
          />
          <MetricCard
            title="Processing"
            value={processingFiles}
            icon={Loader2}
            variant="amber"
          />
          <MetricCard
            title="Needs Attention"
            value={needsAttention}
            icon={AlertCircle}
            variant="red"
          />
        </div>
        
        {/* Bot Health Indicator */}
        <BotHealthIndicator coverage={queries.length === 0 ? 95 : Math.max(50, 100 - queries.length * 2)} />
        
        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Knowledge Base - Left Column */}
          <div className="lg:col-span-3">
            <UploadZone onUpload={handleUpload} />
            <FileList files={files} onDelete={handleDeleteFile} />
          </div>
          
          {/* Query Review - Right Column */}
          <div className="lg:col-span-2">
            <QueryReviewPanel 
              queries={queries}
              pendingCount={queries.length}
              onReview={handleMarkAsResolved}
              onAddToKnowledge={handleMarkAsResolved}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
