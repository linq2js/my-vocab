/**
 * ClickableText component for Read Aloud mode.
 * 
 * When read-aloud mode is active, each word becomes clickable and
 * clicking it will pronounce the word using the speech service.
 * 
 * @example
 * ```tsx
 * <ClickableText language="en">
 *   This is a sample sentence with clickable words.
 * </ClickableText>
 * ```
 */

import { useCallback, type ReactNode } from 'react';
import { useReadAloud } from '../../contexts/ReadAloudContext';
import { useSpeech } from '../../hooks/useSpeech';

interface ClickableTextProps {
  /** The text content to display */
  children: ReactNode;
  /** Language code for pronunciation (ISO 639-1) */
  language?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ClickableText component - makes words clickable for pronunciation.
 */
export const ClickableText = ({ 
  children, 
  language = 'en',
  className = '' 
}: ClickableTextProps) => {
  const { isReadAloudMode } = useReadAloud();
  const { speak, isSpeaking } = useSpeech();

  const handleWordClick = useCallback((word: string) => {
    if (isReadAloudMode && !isSpeaking) {
      // Clean the word of punctuation for better pronunciation
      const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '').trim();
      if (cleanWord) {
        speak(cleanWord, language);
      }
    }
  }, [isReadAloudMode, isSpeaking, speak, language]);

  // If not in read-aloud mode, just render children normally
  if (!isReadAloudMode) {
    return <span className={className}>{children}</span>;
  }

  // Convert children to string and split into words
  const text = typeof children === 'string' ? children : String(children);
  const words = text.split(/(\s+)/); // Split but keep whitespace

  return (
    <span className={className}>
      {words.map((segment, index) => {
        // If it's whitespace, render as-is
        if (/^\s+$/.test(segment)) {
          return <span key={index}>{segment}</span>;
        }
        
        // It's a word - make it clickable
        return (
          <span
            key={index}
            onClick={() => handleWordClick(segment)}
            className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded px-0.5 -mx-0.5 transition-colors"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleWordClick(segment);
              }
            }}
          >
            {segment}
          </span>
        );
      })}
    </span>
  );
};
