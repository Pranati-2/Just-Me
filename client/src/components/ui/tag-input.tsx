import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FaHashtag, FaTimes } from 'react-icons/fa';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  size?: 'default' | 'large';
}

export default function TagInput({
  tags,
  onChange,
  placeholder = 'Add a tag...',
  className = '',
  size = 'default',
}: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove hashtag prefix if user types it
    const value = e.target.value.startsWith('#') 
      ? e.target.value.substring(1) 
      : e.target.value;
      
    setInput(value);
  };

  const addTag = () => {
    if (input.trim() === '') return;

    // Normalize tag - lowercase, no spaces, remove special chars
    const normalizedTag = input.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '');
    
    // Only add if it's not a duplicate and not empty
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onChange([...tags, normalizedTag]);
    }
    
    setInput('');
    
    // Focus back on input after adding
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Add tag on Enter or comma
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
    // Remove last tag on Backspace if input is empty
    else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Focus input when clicking anywhere in the container
  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Tag container size classes
  const containerClasses = size === 'large' 
    ? 'p-3 min-h-[60px]' 
    : 'p-2 min-h-[42px]';
    
  // Tag size classes
  const tagClasses = size === 'large'
    ? 'py-1.5 px-3 text-base'
    : 'py-1 px-2 text-sm';

  // Input size classes
  const inputClasses = size === 'large'
    ? 'text-base h-8'
    : 'text-sm h-6';

  return (
    <div 
      ref={containerRef}
      className={`flex flex-wrap gap-2 items-center border rounded-md bg-white ${containerClasses} ${className}`}
      onClick={handleContainerClick}
    >
      {tags.map((tag, index) => (
        <div
          key={index}
          className={`flex items-center gap-1 bg-primary/10 text-primary rounded-full ${tagClasses}`}
        >
          <FaHashtag size={size === 'large' ? 14 : 12} className="text-primary/70" />
          <span>{tag}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="ml-1 text-primary/70 hover:text-primary"
          >
            <FaTimes size={size === 'large' ? 14 : 12} />
          </button>
        </div>
      ))}
      
      <div className="flex-1 min-w-[100px]">
        <div className="flex items-center">
          <FaHashtag className="text-gray-400 mr-1" size={size === 'large' ? 14 : 12} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`outline-none border-none bg-transparent flex-1 ${inputClasses}`}
          />
        </div>
      </div>
      
      {input.trim() !== '' && (
        <Button 
          type="button" 
          size="sm" 
          variant="ghost" 
          className="py-0 h-auto text-primary hover:text-primary-dark hover:bg-primary/10"
          onClick={addTag}
        >
          Add
        </Button>
      )}
    </div>
  );
}