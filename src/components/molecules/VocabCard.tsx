import { HTMLAttributes, useState } from 'react';
import { Tag } from '../atoms/Tag';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import type { Vocabulary } from '../../types/vocabulary';
import { getContentTypeAbbr, getContentTypeLabel } from '../../constants/contentTypes';
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
}

/**
 * Get badge variant based on content type
 */
const getContentTypeBadgeVariant = (contentType: Vocabulary['contentType']): 'primary' | 'success' | 'warning' | 'info' => {
  const variants: Record<Vocabulary['contentType'], 'primary' | 'success' | 'warning' | 'info'> = {
    vocabulary: 'primary',
    idiom: 'success',
    'phrasal-verb': 'warning',
    quote: 'info',
  };
  return variants[contentType];
};

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
  className = '',
  ...props
}: VocabCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { speak, isSpeaking, isSupported } = useSpeech();

  const {
    text,
    definition,
    ipa,
    examples,
    tags,
    contentType,
    partOfSpeech,
    description,
    language,
    forms,
    extra,
  } = vocabulary;

  const hasExamples = examples && examples.length > 0;
  const hasTags = tags && tags.length > 0;
  const hasForms = forms && Object.keys(forms).length > 0;
  const hasExtra = extra && Object.keys(extra).length > 0;
  const hasExpandableContent = hasExamples || hasTags || definition || hasForms || hasExtra;

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
          {/* Header Row: Badge | Text | Actions (all inline) */}
          <div className="flex items-center gap-2">
            {/* Content Type Badge (circular for single char) */}
            <Badge
              variant={getContentTypeBadgeVariant(contentType)}
              size="sm"
              circular
              title={getContentTypeLabel(contentType)}
            >
              {getContentTypeAbbr(contentType)}
            </Badge>

            {/* Text - grows to fill space */}
            <h3 
              className="flex-1 font-bold text-gray-900 dark:text-gray-100 text-lg truncate"
              title={text}
            >
              {text}
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
          
          {/* IPA, Speak Button, and Part of Speech */}
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
                disabled={isSpeaking}
              >
                <Icon name="volume" size="sm" />
              </button>
            )}
            {partOfSpeech && (
              <span className="italic">{partOfSpeech}</span>
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
          {/* Action Bar - Top (right-aligned) */}
          <div className="flex items-center justify-end gap-1">
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

          {/* Badge | Text (inline, bigger font) */}
          <div className="flex items-center gap-3">
            {/* Content Type Badge (circular for single char) */}
            <Badge
              variant={getContentTypeBadgeVariant(contentType)}
              size="md"
              circular
              title={getContentTypeLabel(contentType)}
            >
              {getContentTypeAbbr(contentType)}
            </Badge>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {text}
            </h3>
          </div>

          {/* IPA, Speak Button, and Part of Speech */}
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
                disabled={isSpeaking}
              >
                <Icon name="volume" size="sm" />
              </button>
            )}
            {partOfSpeech && (
              <span className="italic">{partOfSpeech}</span>
            )}
          </div>

          {/* Extra Fields (user-requested custom enrichment) - displayed FIRST */}
          {hasExtra && (
            <div data-testid="vocab-extra" className="border-b border-gray-200 dark:border-gray-600 pb-3 mb-3">
              {Object.entries(extra!).map(([key, value]) => (
                value && (
                  <div key={key} className="mb-2 last:mb-0">
                    <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 tracking-wide mb-1 capitalize">
                      {key}
                    </h4>
                    <p className="text-base text-gray-700 dark:text-gray-300">
                      {value}
                    </p>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Definition */}
          {(definition || description) && (
            <div data-testid="vocab-definition">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Definition
              </h4>
              <p className="text-base text-gray-700 dark:text-gray-300">
                {definition || description}
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
                    <span
                      key={key}
                      className="inline-flex items-center px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm"
                    >
                      <span className="font-medium">{formatFormLabel(key)}:</span>
                      <span className="ml-1">{value}</span>
                    </span>
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
                    className="text-base text-gray-600 dark:text-gray-400 pl-3 border-l-2 border-gray-200 dark:border-gray-600"
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {hasTags && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {tags.map((tag) => (
                <Tag key={tag} size="sm" variant="default">
                  {tag}
                </Tag>
              ))}
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
              This action cannot be undone. This will permanently delete this {getContentTypeLabel(contentType).toLowerCase()} from your collection.
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
