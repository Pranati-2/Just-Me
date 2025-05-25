import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { FaSmile } from 'react-icons/fa';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function WhatsAppEmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setShowPicker(false);
  };

  // Handle clicks outside the emoji picker to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) && 
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        className="p-2 text-gray-500 hover:text-gray-700"
        onClick={() => setShowPicker(!showPicker)}
        title="Add emoji"
      >
        <FaSmile size={20} />
      </button>
      
      {showPicker && (
        <div 
          ref={pickerRef} 
          className="absolute bottom-12 left-0 z-10"
          style={{ height: '350px' }}
        >
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}
    </div>
  );
}