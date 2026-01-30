import { FileText, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  status: 'indexed' | 'processing';
}

interface FileListProps {
  files: UploadedFile[];
  onDelete?: (id: string) => void;
}

export function FileList({ files, onDelete }: FileListProps) {
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: 'text-red-500 bg-red-50',
      docx: 'text-blue-500 bg-blue-50',
      xlsx: 'text-green-500 bg-green-50',
      txt: 'text-gray-500 bg-gray-50',
    };
    return colors[ext || ''] || colors.txt;
  };

  return (
    <div className="panel mt-4">
      <h3 className="mb-4 text-lg font-semibold text-foreground">
        Uploaded Files ({files.length})
      </h3>
      
      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="group flex items-center gap-4 rounded-lg border bg-card p-3 transition-all hover:border-accent/30 hover:shadow-sm"
          >
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              getFileIcon(file.name)
            )}>
              <FileText className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {file.size} • Uploaded {file.uploadedAt}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {file.status === 'indexed' ? (
                <span className="status-badge status-indexed">
                  <CheckCircle className="h-3 w-3" />
                  Indexed
                </span>
              ) : (
                <span className="status-badge status-processing">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processing
                </span>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete?.(file.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
