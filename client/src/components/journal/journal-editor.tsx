import { useState, useEffect } from 'react';
import { useUser } from '@/context/new-user-context';
import RichTextEditor from '@/components/ui/rich-text-editor';
import TagInput from '@/components/ui/tag-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createJournalEntry, updateJournalEntry } from '@/lib/storage';
import { JournalEntry } from '@shared/schema';
import { format } from 'date-fns';

interface JournalEditorProps {
  entry?: JournalEntry;
  onSave?: (entry: JournalEntry) => void;
  onDiscard?: () => void;
}

export default function JournalEditor({ entry, onSave, onDiscard }: JournalEditorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  
  // Data for the journal entry
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.formattedContent?.html || '');
  const [mood, setMood] = useState(entry?.mood || '');
  const [weather, setWeather] = useState(entry?.weather || '');
  const [location, setLocation] = useState(entry?.location || '');
  const [entryDate, setEntryDate] = useState(
    entry?.date ? format(new Date(entry.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showWeatherSelector, setShowWeatherSelector] = useState(false);

  const moodOptions = [
    { value: 'happy', icon: 'ri-emotion-happy-line', label: 'Happy' },
    { value: 'excited', icon: 'ri-emotion-laugh-line', label: 'Excited' },
    { value: 'calm', icon: 'ri-emotion-normal-line', label: 'Calm' },
    { value: 'sad', icon: 'ri-emotion-sad-line', label: 'Sad' },
    { value: 'angry', icon: 'ri-emotion-unhappy-line', label: 'Angry' },
    { value: 'tired', icon: 'ri-emotion-line', label: 'Tired' }
  ];

  const weatherOptions = [
    { value: 'sunny', icon: 'ri-sun-line', label: 'Sunny' },
    { value: 'cloudy', icon: 'ri-cloud-line', label: 'Cloudy' },
    { value: 'rainy', icon: 'ri-rainy-line', label: 'Rainy' },
    { value: 'stormy', icon: 'ri-thunderstorms-line', label: 'Stormy' },
    { value: 'snowy', icon: 'ri-snowy-line', label: 'Snowy' },
    { value: 'foggy', icon: 'ri-mist-line', label: 'Foggy' }
  ];

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to save journal entries.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() && !content.trim()) {
      toast({
        title: "Content required",
        description: "Please add either a title or some content for your journal entry.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const entryData = {
        userId: user.id,
        title,
        content,
        formattedContent: { html: content },
        date: new Date(entryDate),
        mood,
        weather,
        location,
        tags
      };

      let savedEntry;
      if (entry?.id) {
        // Update existing entry
        savedEntry = await updateJournalEntry(entry.id, entryData);
      } else {
        // Create new entry
        savedEntry = await createJournalEntry(entryData);
      }

      if (savedEntry) {
        toast({
          title: "Journal entry saved",
          description: "Your journal entry has been saved successfully."
        });
        
        // Clear draft after successful save
        import('@/lib/draft-utils').then(({ clearDraft }) => {
          clearDraft('journal', entry?.id?.toString() || 'new');
        });
        
        if (onSave) onSave(savedEntry);
      }
    } catch (error) {
      toast({
        title: "Error saving journal entry",
        description: "An error occurred while saving your journal entry.",
        variant: "destructive",
      });
      console.error('Error saving journal entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectMood = (moodValue: string) => {
    setMood(moodValue);
    setShowMoodSelector(false);
  };

  const selectWeather = (weatherValue: string) => {
    setWeather(weatherValue);
    setShowWeatherSelector(false);
  };

  // Helper to get the selected mood or weather icon
  const getSelectedIcon = (value: string, options: any[]) => {
    const option = options.find(o => o.value === value);
    return option ? option.icon : options[0].icon;
  };
  
  // Autosave effect for all fields
  useEffect(() => {
    if (!entry?.id && (title.trim() || content.trim() || tags.length > 0 || mood || weather || location)) {
      const draftId = entry?.id?.toString() || 'new';
      const saveTimeout = setTimeout(() => {
        // Save to local draft
        import('@/lib/draft-utils').then(({ saveDraft }) => {
          const draftData = JSON.stringify({
            content,
            title,
            tags,
            mood,
            weather,
            location,
            entryDate
          });
          saveDraft('journal', draftId, draftData);
        });
      }, 2000); // 2 second debounce
      
      return () => clearTimeout(saveTimeout);
    }
  }, [title, content, tags, mood, weather, location, entryDate, entry?.id]);

  // Handle discard to clear any drafts
  const handleDiscard = () => {
    // Clear any existing draft
    import('@/lib/draft-utils').then(({ clearDraft }) => {
      clearDraft('journal', entry?.id?.toString() || 'new');
    });
    
    // Call the passed onDiscard callback
    if (onDiscard) onDiscard();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-3">
        <Input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        />
        <div className="flex space-x-1">
          {/* Mood selector */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              onClick={() => setShowMoodSelector(!showMoodSelector)}
              title="Mood"
            >
              <i className={mood ? getSelectedIcon(mood, moodOptions) : 'ri-emotion-happy-line'}></i>
            </Button>
            {showMoodSelector && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded shadow-md z-10 p-1">
                <div className="grid grid-cols-3 gap-1">
                  {moodOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex flex-col items-center"
                      onClick={() => selectMood(option.value)}
                    >
                      <i className={option.icon}></i>
                      <span className="text-xs mt-1">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Weather selector */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              onClick={() => setShowWeatherSelector(!showWeatherSelector)}
              title="Weather"
            >
              <i className={weather ? getSelectedIcon(weather, weatherOptions) : 'ri-sun-line'}></i>
            </Button>
            {showWeatherSelector && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded shadow-md z-10 p-1">
                <div className="grid grid-cols-3 gap-1">
                  {weatherOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex flex-col items-center"
                      onClick={() => selectWeather(option.value)}
                    >
                      <i className={option.icon}></i>
                      <span className="text-xs mt-1">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Location button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
                  },
                  (error) => {
                    toast({
                      title: "Location error",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                );
              } else {
                toast({
                  title: "Location not supported",
                  description: "Geolocation is not supported by your browser.",
                  variant: "destructive",
                });
              }
            }}
            title="Location"
          >
            <i className="ri-map-pin-line"></i>
          </Button>
        </div>
      </div>
      
      <Input
        type="text"
        placeholder="Entry Title"
        className="w-full text-xl font-medium mb-3 focus-visible:ring-0"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Dear Journal..."
        minHeight="200px"
        showSubmitButton={false}
        autosave={true}
        draftType="journal"
        draftId={entry?.id?.toString() || 'new'}
        onDraftFound={(draftContent) => {
          try {
            // Try to parse as JSON for drafts with additional data
            const draftData = JSON.parse(draftContent);
            setContent(draftData.content || draftContent);
            
            if (draftData.title) setTitle(draftData.title);
            if (draftData.tags && Array.isArray(draftData.tags)) setTags(draftData.tags);
            if (draftData.mood) setMood(draftData.mood);
            if (draftData.weather) setWeather(draftData.weather);
            if (draftData.location) setLocation(draftData.location);
            if (draftData.entryDate) setEntryDate(draftData.entryDate);
          } catch (e) {
            // For older drafts or simple string content
            setContent(draftContent);
          }
          
          toast({
            title: "Draft restored",
            description: "Your previous unsaved journal entry has been restored.",
          });
        }}
      />
      
      {/* Tags and mood display */}
      <div className="flex flex-wrap justify-between items-center mt-3 pt-3 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          {mood && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
              <i className={getSelectedIcon(mood, moodOptions) + " mr-1"}></i>
              {moodOptions.find(o => o.value === mood)?.label || mood}
            </span>
          )}
          
          {weather && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center">
              <i className={getSelectedIcon(weather, weatherOptions) + " mr-1"}></i>
              {weatherOptions.find(o => o.value === weather)?.label || weather}
            </span>
          )}
          
          {location && (
            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
              <i className="ri-map-pin-line mr-1"></i>
              {location}
            </span>
          )}
          
          <div className="flex-grow max-w-md">
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Add tags..."
              size="large"
            />
          </div>
        </div>
        
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDiscard} 
            className="mr-2"
          >
            Discard
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving || (!title.trim() && !content.trim())}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
