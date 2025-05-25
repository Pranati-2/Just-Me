import type { Document } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CopyExportActions } from '@/components/common/copy-export-actions';
import { DeleteButton } from '@/components/ui/delete-button';

interface DocumentCardProps {
  document: Document;
  onEdit: (document: Document) => void;
  onDelete: (documentId: number) => void;
}

// Predefined categories - matching the ones in document-editor.tsx
const categories = [
  { id: 'general', name: 'General' },
  { id: 'technical', name: 'Technical' },
  { id: 'project', name: 'Project' },
  { id: 'personal', name: 'Personal' },
  { id: 'workflow', name: 'Workflow' }
];

// Helper to strip HTML tags for the preview
const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return '';
  const div = window.document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

export default function DocumentCard({ document: doc, onEdit, onDelete }: DocumentCardProps) {

  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case 'technical':
        return 'border-blue-500';
      case 'project':
        return 'border-green-500';
      case 'personal':
        return 'border-pink-500';
      case 'workflow':
        return 'border-orange-500';
      default:
        return 'border-indigo-500';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border-l-4 ${getCategoryColor(doc.category || 'general')}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 cursor-pointer" onClick={() => onEdit(doc)}>
          <h3 className="font-medium text-gray-800">{doc.title}</h3>
          <div className="flex items-center mt-1">
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs">
              {categories.find(cat => cat.id === doc.category)?.name || doc.category}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {/* Prominent Delete Button */}
          <DeleteButton 
            onDelete={() => onDelete(doc.id)}
            itemName="document"
            stopPropagation={true}
          />
          
          {/* Other Actions */}
          <div className="flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-indigo-500"
                    onClick={() => onEdit(doc)}
                  >
                    <i className="ri-edit-line"></i>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit document</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Copy and Export Actions */}
            <CopyExportActions 
              title={doc.title}
              content={doc.formattedContent?.html || doc.content}
              isHtml={!!doc.formattedContent?.html}
              fileName={`document_${doc.id}_${doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
              size="sm"
              iconOnly={true}
            />
          </div>
        </div>
      </div>
      <div 
        className="text-gray-600 text-sm line-clamp-2 mt-2 cursor-pointer" 
        onClick={() => onEdit(doc)}
      >
        {stripHtml(doc.formattedContent?.html || doc.content)}
      </div>
    </div>
  );
}