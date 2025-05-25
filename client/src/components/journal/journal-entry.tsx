import { JournalEntry } from '@shared/schema';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { CopyExportActions } from '@/components/common/copy-export-actions';
import { DeleteButton } from '@/components/ui/delete-button';

interface JournalEntryProps {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entryId: number) => void;
}

export default function JournalEntryComponent({ entry, onEdit, onDelete }: JournalEntryProps) {
  // Format date as "Friday, November 10, 2023"
  const formattedDate = format(new Date(entry.date), 'EEEE, MMMM d, yyyy');
  // Format time as "10:30 AM"
  const formattedTime = format(new Date(entry.createdAt), 'h:mm a');
  
  // Helper to get mood icon
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy': return 'ri-emotion-happy-line';
      case 'excited': return 'ri-emotion-laugh-line';
      case 'calm': return 'ri-emotion-normal-line';
      case 'sad': return 'ri-emotion-sad-line';
      case 'angry': return 'ri-emotion-unhappy-line';
      case 'tired': return 'ri-emotion-line';
      default: return 'ri-emotion-line';
    }
  };
  
  // Helper to get weather icon
  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'sunny': return 'ri-sun-line';
      case 'cloudy': return 'ri-cloud-line';
      case 'rainy': return 'ri-rainy-line';
      case 'stormy': return 'ri-thunderstorms-line';
      case 'snowy': return 'ri-snowy-line';
      case 'foggy': return 'ri-mist-line';
      default: return 'ri-sun-line';
    }
  };
  
  // Helper to strip HTML tags for the preview
  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return '';
    const tmp = window.document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onEdit(entry)}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <span className="font-medium text-gray-700">{formattedDate}</span>
          <div className="flex space-x-1 ml-2">
            {entry.mood && (
              <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full">
                <i className={getMoodIcon(entry.mood) + " text-xs"}></i>
              </span>
            )}
            {entry.weather && (
              <span className="w-6 h-6 flex items-center justify-center bg-yellow-100 text-yellow-800 rounded-full">
                <i className={getWeatherIcon(entry.weather) + " text-xs"}></i>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {/* Delete Button with Confirmation */}
          <DeleteButton 
            onDelete={() => onDelete(entry.id)}
            itemName="journal entry"
            stopPropagation={true}
          />
          
          {/* Copy and Export Actions */}
          <CopyExportActions 
            title={entry.title}
            content={entry.formattedContent?.html || entry.content}
            isHtml={!!entry.formattedContent?.html}
            fileName={`journal_${format(new Date(entry.date), 'yyyy_MM_dd')}`}
            size="sm"
            iconOnly={true}
          />
        </div>
      </div>
      
      <h3 className="font-medium text-gray-800 mb-1">{entry.title}</h3>
      <p className="text-gray-600 text-sm line-clamp-2">
        {stripHtml(entry.formattedContent?.html || entry.content)}
      </p>
      
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
        <div className="flex flex-wrap gap-1">
          {entry.tags && entry.tags.map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-500">{formattedTime}</span>
      </div>
    </div>
  );
}
