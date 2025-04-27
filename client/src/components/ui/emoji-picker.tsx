import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmileIcon } from 'lucide-react';

// Common emoji categories for quick access
const commonEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', 
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '👍', '👎', '👏', '🙌', '🎉', '✨', '🔥', '💯', '❤️', '🧡',
  '💛', '💚', '💙', '💜', '🖤', '❣️', '💕', '💞', '💓', '💗',
  '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟'
];

// Emoji categories
const categories = [
  { name: 'Smileys', emojis: ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊'] },
  { name: 'Gestures', emojis: ['👍', '👎', '👌', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️'] },
  { name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕'] },
  { name: 'Objects', emojis: ['🎁', '🎈', '🎉', '🎊', '🎂', '🎄', '🎗️', '🎟️', '🎫', '🏆'] }
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Frequent');
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setIsOpen(true)}
        >
          <SmileIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        ref={popoverRef}
        className="w-[350px] p-0" 
        align="start"
        side="top"
      >
        <div className="p-4">
          <div className="flex flex-wrap gap-1 mb-4">
            {/* Frequent emojis for quick access */}
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                className="p-1 text-xl hover:bg-muted rounded"
                onClick={() => {
                  onEmojiSelect(emoji);
                  setIsOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          <div className="border-t pt-2">
            <div className="flex mb-2 border-b">
              <button
                className={`px-3 py-1 text-sm ${activeCategory === 'Frequent' ? 'border-b-2 border-primary font-medium' : ''}`}
                onClick={() => setActiveCategory('Frequent')}
              >
                Frequent
              </button>
              {categories.map(category => (
                <button
                  key={category.name}
                  className={`px-3 py-1 text-sm ${activeCategory === category.name ? 'border-b-2 border-primary font-medium' : ''}`}
                  onClick={() => setActiveCategory(category.name)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
              {activeCategory === 'Frequent' ? (
                commonEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    className="p-1 text-xl hover:bg-muted rounded"
                    onClick={() => {
                      onEmojiSelect(emoji);
                      setIsOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))
              ) : (
                categories.find(c => c.name === activeCategory)?.emojis.map((emoji, index) => (
                  <button
                    key={index}
                    className="p-1 text-xl hover:bg-muted rounded"
                    onClick={() => {
                      onEmojiSelect(emoji);
                      setIsOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}