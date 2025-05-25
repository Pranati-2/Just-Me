import { Note } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { CopyExportActions } from '@/components/common/copy-export-actions';
import { DeleteButton } from '@/components/ui/delete-button';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (noteId: number) => void;
  onCopy?: (note: Note) => void;
}

const colorVariants = {
  yellow: 'bg-amber-50 border-amber-300',
  blue: 'bg-blue-50 border-blue-300',
  green: 'bg-green-50 border-green-300',
  pink: 'bg-pink-50 border-pink-300',
  purple: 'bg-purple-50 border-purple-300',
  gray: 'bg-gray-50 border-gray-300',
};

// Helper to strip HTML tags for the preview
const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return '';
  const div = window.document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

export default function NoteCard({ note, onEdit, onDelete, onCopy }: NoteCardProps) {
  // Get color class based on note color, default to yellow
  const colorClass = note.color && colorVariants[note.color as keyof typeof colorVariants] 
    ? colorVariants[note.color as keyof typeof colorVariants] 
    : colorVariants.yellow;

  return (
    <div 
      className={`rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow border ${colorClass} h-full flex flex-col`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 
          className="font-medium text-gray-800 cursor-pointer"
          onClick={() => onEdit(note)}
        >
          {note.title}
        </h3>
        <div className="flex items-center space-x-1">
          {/* Delete Button with Confirmation */}
          <DeleteButton 
            onDelete={() => onDelete(note.id)}
            itemName="note"
            stopPropagation={true}
            size="sm"
          />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-indigo-500 h-7 w-7"
                  onClick={() => onEdit(note)}
                >
                  <i className="ri-edit-line"></i>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit note</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Copy and Export Actions */}
          <CopyExportActions 
            title={note.title}
            content={note.formattedContent?.html || note.content}
            isHtml={!!note.formattedContent?.html}
            fileName={`note_${note.id}_${note.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
            size="sm"
            iconOnly={true}
            onCopy={onCopy ? () => onCopy(note) : undefined}
          />
        </div>
      </div>
      
      <div 
        className="text-gray-600 text-sm flex-grow cursor-pointer" 
        onClick={() => onEdit(note)}
      >
        <p className="line-clamp-6 whitespace-pre-wrap">
          {stripHtml(note.formattedContent?.html || note.content)}
        </p>
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center">
        <div className="flex flex-wrap gap-1">
          {note.tags && note.tags.map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-0.5 bg-white/50 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}