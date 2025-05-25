import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PostTagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function PostTags({ tags = [], onChange }: PostTagsProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      onChange(newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {tags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200"
          >
            #{tag}
            <button
              type="button"
              className="ml-1 text-blue-800 hover:text-blue-900"
              onClick={() => handleRemoveTag(tag)}
            >
              <i className="ri-close-line"></i>
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center">
        <Input
          type="text"
          placeholder="Add a tag..."
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm"
        />
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={handleAddTag}
          className="ml-2"
        >
          <i className="ri-add-line mr-1"></i>
          Add
        </Button>
      </div>
    </div>
  );
}