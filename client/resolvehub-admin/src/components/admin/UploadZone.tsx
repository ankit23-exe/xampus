import { useState, useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onUpload?: (files: FileList) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && onUpload) {
      onUpload(e.dataTransfer.files);
    }
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onUpload) {
      onUpload(e.target.files);
    }
  }, [onUpload]);

  return (
    <div className="panel">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Knowledge Base</h3>
      </div>
      
      <div
        className={cn('upload-zone', isDragOver && 'drag-over')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <div className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors',
            isDragOver ? 'bg-accent/20' : 'bg-muted'
          )}>
            <Upload className={cn(
              'h-6 w-6 transition-colors',
              isDragOver ? 'text-accent' : 'text-muted-foreground'
            )} />
          </div>
          
          <p className="mb-1 text-base font-medium text-foreground">
            Drag and drop files here
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            Supports PDF, DOCX, XLSX, TXT files up to 10MB
          </p>
          
          <label>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.docx,.xlsx,.txt"
              onChange={handleFileSelect}
            />
            <Button variant="default" className="cursor-pointer" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
          
          <p className="mt-4 text-xs text-muted-foreground">
            Files here directly improve chatbot accuracy
          </p>
        </div>
      </div>
    </div>
  );
}
