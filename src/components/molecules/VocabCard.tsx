import { HTMLAttributes, useState, useMemo } from 'react';
import { Tag } from '../atoms/Tag';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { ClickableText } from '../atoms/ClickableText';
import type { Vocabulary } from '../../types/vocabulary';
import { separateTags, getPredefinedTag } from '../../constants/predefinedTags';
import { useSpeech } from '../../hooks/useSpeech';

/**
 * Props for the VocabCard component
 */
export interface VocabCardProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  /** The vocabulary entry to display */
  vocabulary: Vocabulary;
  /** Whether to show a compact version (hides examples) */
  compact?: boolean;
  /** Callback when edit button is clicked */
  onEdit?: (vocabulary: Vocabulary) => void;
  /** Callback when delete button is clicked */
  onDelete?: (vocabulary: Vocabulary) => void;
  /** Callback when translate button is clicked - passes text and language to translate */
  onTranslate?: (text: string, language: string) => void;
  /** User's native language code - hides translate buttons when vocab language matches */
  nativeLanguage?: string;
}

/**
 * Maps form keys to human-readable labels.
 */
const FORM_LABELS: Record<string, string> = {
  past: 'Past',
  pastParticiple: 'Past Participle',
  presentParticiple: 'Present Participle',
  thirdPerson: '3rd Person',
  plural: 'Plural',
  comparative: 'Comparative',
  superlative: 'Superlative',
};

/**
 * Formats a form key into a human-readable label.
 */
const formatFormLabel = (key: string): string => {
  return FORM_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
};

/**
 * VocabCard molecule component for displaying vocabulary entries.
 * 
 * Features:
 * - Collapsible card with expand/collapse toggle
 * - Collapsed: shows text (truncated), IPA, description (truncated)
 * - Expanded: shows full content including examples and tags
 * - Action buttons: expand/collapse, edit, delete
 * - Delete confirmation dialog
 * - Full dark mode support
 *
 * @example
 * ```tsx
 * // Basic usage
 * <VocabCard vocabulary={vocab} />
 *
 * // With edit/delete actions
 * <VocabCard
 *   vocabulary={vocab}
 *   onEdit={(v) => handleEdit(v)}
 *   onDelete={(v) => handleDelete(v)}
 * />
 * ```
 */
export const VocabCard = ({
  vocabulary,
  compact = false,
  onEdit,
  onDelete,
  onTranslate,
  nativeLanguage,
  className = '',
  ...props
}: VocabCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { speak, isSupported } = useSpeech();

  const {
    text,
    definition,
    ipa,
    examples,
    tags,
    partOfSpeech,
    description,
    language,
    forms,
    extra,
    senses,
  } = vocabulary;

  // Separate predefined and custom tags
  const { predefined: predefinedTags, custom: customTags } = useMemo(
    () => separateTags(tags || []),
    [tags]
  );

  const hasExamples = examples && examples.length > 0;
  const hasCustomTags = customTags && customTags.length > 0;
  const hasForms = forms && Object.keys(forms).length > 0;
  const hasExtra = extra && Object.keys(extra).length > 0;
  const hasSenses = senses && senses.length > 0;
  const hasExpandableContent = hasExamples || hasCustomTags || definition || hasForms || hasExtra || hasSenses;

  // Always show part of speech when it exists
  const showPartOfSpeech = !!partOfSpeech;

  /**
   * Toggle expanded state
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  /**
   * Handle edit button click
   */
  const handleEdit = () => {
    onEdit?.(vocabulary);
  };

  /**
   * Handle delete button click - show confirmation
   */
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  /**
   * Confirm delete
   */
  const handleConfirmDelete = () => {
    onDelete?.(vocabulary);
    setShowDeleteConfirm(false);
  };

  /**
   * Cancel delete
   */
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  /**
   * Handle speak button click
   */
  const handleSpeak = () => {
    speak(text, language);
  };

  /**
   * Check if translate buttons should be shown
   * Hide when vocab language matches user's native language
   */
  const showTranslateButtons = onTranslate && language !== nativeLanguage;

  /**
   * Handle translate button click for specific text
   */
  const handleTranslateText = (textToTranslate: string) => {
    onTranslate?.(textToTranslate, language);
  };

  // Card container classes
  const cardClasses = [
    'bg-white dark:bg-gray-800',
    'border border-gray-200 dark:border-gray-700',
    'rounded-xl shadow-sm',
    'p-4',
    'transition-shadow duration-200',
    'hover:shadow-md',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Display text - use description or definition for the subtitle
  const subtitleText = description || definition || '';

  return (
    <article
      className={cardClasses}
      role="article"
      aria-label={`Vocabulary: ${text}`}
      {...props}
    >
      {/* COLLAPSED VIEW */}
      {!isExpanded && (
        <div className="space-y-1">
          {/* Header Row: Text | Actions (all inline) */}
          <div className="flex items-center gap-2">
            {/* Text - grows to fill space */}
            <h3 
              className="flex-1 flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100 text-lg truncate"
              title={text}
            >
              {language && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0">
                  [{language}]
                </span>
              )}
              <span className="truncate">{text}</span>
            </h3>

            {/* Action Section */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Expand Button */}
              {hasExpandableContent && !compact && (
                <button
                  onClick={toggleExpanded}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Expand"
                  aria-expanded={false}
                >
                  <Icon name="chevron-down" size="sm" />
                </button>
              )}
              
              {/* Edit Button */}
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                  aria-label="Edit"
                >
                  <Icon name="edit" size="sm" />
                </button>
              )}
              
              {/* Delete Button */}
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Delete"
                >
                  <Icon name="trash" size="sm" />
                </button>
              )}
            </div>
          </div>
          
          {/* IPA, Speak Button, Part of Speech, and Categories */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {ipa && (
              <span data-testid="vocab-ipa" className="font-mono">
                {ipa}
              </span>
            )}
            {/* Speak Button */}
            {isSupported && (
              <button
                onClick={handleSpeak}
                className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                aria-label="Read aloud"
              >
                <Icon name="volume" size="sm" />
              </button>
            )}
            {showPartOfSpeech && (
              <span className="italic">{partOfSpeech}</span>
            )}
            {/* Predefined Tags as text */}
            {predefinedTags.length > 0 && (
              <>
                {(ipa || showPartOfSpeech) && <span className="text-gray-300 dark:text-gray-600">·</span>}
                <span className="text-gray-500 dark:text-gray-400">
                  {predefinedTags.map(tagId => getPredefinedTag(tagId)?.label).filter(Boolean).join(', ')}
                </span>
              </>
            )}
          </div>

          {/* Description/Definition - truncated */}
          {subtitleText && (
            <p 
              className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
              title={subtitleText}
            >
              {subtitleText}
            </p>
          )}
        </div>
      )}

      {/* EXPANDED VIEW */}
      {isExpanded && !compact && (
        <div className="space-y-3">
          {/* Action Bar - Top (right-aligned, minimal bottom spacing) */}
          <div className="flex items-center justify-end gap-1 -mb-2">
            {/* Collapse Button */}
            <button
              onClick={toggleExpanded}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Collapse"
              aria-expanded={true}
            >
              <Icon name="chevron-up" size="sm" />
            </button>
            
            {/* Edit Button */}
            {onEdit && (
              <button
                onClick={handleEdit}
                className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                aria-label="Edit"
              >
                <Icon name="edit" size="sm" />
              </button>
            )}
            
            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                aria-label="Delete"
              >
                <Icon name="trash" size="sm" />
              </button>
            )}
          </div>

          {/* Text (bigger font) */}
          <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {language && (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                [{language}]
              </span>
            )}
            {text}
          </h3>

          {/* IPA, Speak Button, Part of Speech, and Categories */}
          <div className="flex items-center gap-2 text-base text-gray-500 dark:text-gray-400">
            {ipa && (
              <span data-testid="vocab-ipa" className="font-mono">
                {ipa}
              </span>
            )}
            {/* Speak Button */}
            {isSupported && (
              <button
                onClick={handleSpeak}
                className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                aria-label="Read aloud"
              >
                <Icon name="volume" size="sm" />
              </button>
            )}
            {showPartOfSpeech && (
              <span className="italic">{partOfSpeech}</span>
            )}
            {/* Predefined Tags as text */}
            {predefinedTags.length > 0 && (
              <>
                {(ipa || showPartOfSpeech) && <span className="text-gray-300 dark:text-gray-600">·</span>}
                <span className="text-gray-500 dark:text-gray-400">
                  {predefinedTags.map(tagId => getPredefinedTag(tagId)?.label).filter(Boolean).join(', ')}
                </span>
              </>
            )}
          </div>

          {/* Custom Tags - shown right below header */}
          {hasCustomTags && (
            <div className="flex flex-wrap gap-1.5">
              {customTags.map((tag) => (
                <Tag key={tag} size="sm" variant="default">
                  {tag}
                </Tag>
              ))}
            </div>
          )}

          {/* Extra Fields (user-requested custom enrichment) - displayed FIRST */}
          {hasExtra && (
            <div data-testid="vocab-extra" className="border-b border-gray-200 dark:border-gray-600 pb-3 mb-3">
              {Object.entries(extra!).map(([key, value]) => (
                value && (
                  <div key={key} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-1 mb-1">
                      <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 tracking-wide capitalize">
                        {key}
                      </h4>
                      {isSupported && (
                        <button
                          onClick={() => speak(value, language)}
                          className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                          aria-label={`Read ${key} aloud`}
                        >
                          <Icon name="volume" size="sm" />
                        </button>
                      )}
                    </div>
                    <p className="text-base text-gray-700 dark:text-gray-300">
                      <ClickableText language={language}>{value}</ClickableText>
                    </p>
                  </div>
                )
              ))}
            </div>
          )}

          {/* User Description (Notes) */}
          {description && (
            <div data-testid="vocab-description">
              <div className="flex items-center gap-1 mb-1">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Notes
                </h4>
                {isSupported && (
                  <button
                    onClick={() => speak(description, language)}
                    className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                    aria-label="Read notes aloud"
                  >
                    <Icon name="volume" size="sm" />
                  </button>
                )}
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300">
                <ClickableText language={language}>{description}</ClickableText>
              </p>
            </div>
          )}

          {/* AI Definition */}
          {definition && (
            <div data-testid="vocab-definition">
              <div className="flex items-center gap-1 mb-1">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Definition
                </h4>
                {isSupported && (
                  <button
                    onClick={() => speak(definition, language)}
                    className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                    aria-label="Read definition aloud"
                  >
                    <Icon name="volume" size="sm" />
                  </button>
                )}
                {showTranslateButtons && (
                  <button
                    onClick={() => handleTranslateText(definition)}
                    className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
                    aria-label="Translate definition"
                  >
                    <Icon name="translate" size="sm" />
                  </button>
                )}
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300">
                <ClickableText language={language}>{definition}</ClickableText>
              </p>
            </div>
          )}

          {/* Forms */}
          {hasForms && (
            <div data-testid="vocab-forms">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Forms
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(forms!).map(([key, value]) => (
                  value && (
                    <button
                      key={key}
                      onClick={() => isSupported && speak(value, language)}
                      className={`inline-flex items-center px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm transition-colors ${
                        isSupported ? 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50' : ''
                      }`}
                      aria-label={`${formatFormLabel(key)}: ${value}. Click to hear pronunciation`}
                    >
                      <span className="font-medium">{formatFormLabel(key)}:</span>
                      <span className="ml-1">{value}</span>
                    </button>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          {hasExamples && (
            <div data-testid="vocab-examples">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Examples
              </h4>
              <ul className="space-y-2">
                {examples.map((example, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-base text-gray-600 dark:text-gray-400"
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="flex-1">
                      <ClickableText language={language}>{example}</ClickableText>
                    </span>
                    {isSupported && (
                      <button
                        onClick={() => speak(example, language)}
                        className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors shrink-0"
                        aria-label={`Read example ${index + 1} aloud`}
                      >
                        <Icon name="volume" size="sm" />
                      </button>
                    )}
                    {showTranslateButtons && (
                      <button
                        onClick={() => handleTranslateText(example)}
                        className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-colors shrink-0"
                        aria-label={`Translate example ${index + 1}`}
                      >
                        <Icon name="translate" size="sm" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Additional Senses/Meanings */}
          {hasSenses && (
            <div data-testid="vocab-senses" className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Other Meanings
              </h4>
              <div className="space-y-4">
                {senses.map((sense, senseIndex) => (
                  <div 
                    key={senseIndex} 
                    className=""
                  >
                    {/* Sense type (part of speech) */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 italic">
                        {sense.type}
                      </span>
                    </div>
                    
                    {/* Sense definition */}
                    <div className="flex items-start gap-1 mb-2">
                      <p className="text-base text-gray-700 dark:text-gray-300 flex-1">
                        <ClickableText language={language}>{sense.definition}</ClickableText>
                      </p>
                      {isSupported && (
                        <button
                          onClick={() => speak(sense.definition, language)}
                          className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors shrink-0"
                          aria-label="Read definition aloud"
                        >
                          <Icon name="volume" size="sm" />
                        </button>
                      )}
                      {showTranslateButtons && (
                        <button
                          onClick={() => handleTranslateText(sense.definition)}
                          className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-colors shrink-0"
                          aria-label="Translate definition"
                        >
                          <Icon name="translate" size="sm" />
                        </button>
                      )}
                    </div>
                    
                    {/* Sense forms */}
                    {sense.forms && Object.keys(sense.forms).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {Object.entries(sense.forms).map(([key, value]) => (
                          value && (
                            <button
                              key={key}
                              onClick={() => isSupported && speak(value, language)}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs transition-colors ${
                                isSupported ? 'cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900/50' : ''
                              }`}
                              aria-label={`${formatFormLabel(key)}: ${value}. Click to hear pronunciation`}
                            >
                              <span className="font-medium">{formatFormLabel(key)}:</span>
                              <span className="ml-1">{value}</span>
                            </button>
                          )
                        ))}
                      </div>
                    )}
                    
                    {/* Sense examples */}
                    {sense.examples && sense.examples.length > 0 && (
                      <ul className="space-y-2 mt-2">
                        {sense.examples.map((ex, exIndex) => (
                          <li 
                            key={exIndex}
                            className="flex items-start gap-2 text-base text-gray-600 dark:text-gray-400"
                          >
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full shrink-0 mt-0.5">
                              {exIndex + 1}
                            </span>
                            <span className="flex-1">
                              <ClickableText language={language}>{ex}</ClickableText>
                            </span>
                            {isSupported && (
                              <button
                                onClick={() => speak(ex, language)}
                                className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors shrink-0"
                                aria-label={`Read example ${exIndex + 1} aloud`}
                              >
                                <Icon name="volume" size="sm" />
                              </button>
                            )}
                            {showTranslateButtons && (
                              <button
                                onClick={() => handleTranslateText(ex)}
                                className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-colors shrink-0"
                                aria-label={`Translate example ${exIndex + 1}`}
                              >
                                <Icon name="translate" size="sm" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            {/* Warning Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Icon name="warning" size="lg" className="text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h3 
              id="delete-dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2"
            >
              Delete "{text}"?
            </h3>

            {/* Message */}
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
              This action cannot be undone. This will permanently delete this entry from your collection.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleCancelDelete}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
