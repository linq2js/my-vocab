import { useState, useCallback, useId, FormEvent, ChangeEvent } from 'react';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { TagInput } from '../molecules/TagInput';
import { LANGUAGES, DEFAULT_LANGUAGE_CODE } from '../../constants/languages';
import { ContentType } from '../../constants/contentTypes';
import { gptService } from '../../services/gpt.service';
import { useNetworkStatus, getNetworkErrorMessage } from '../../hooks';
import type { Vocabulary, ContentType as ContentTypeValue } from '../../types/vocabulary';

/**
 * Form data structure for vocabulary creation/editing.
 * Omits auto-generated fields like id and timestamps.
 */
export interface VocabFormData {
  text: string;
  description?: string;
  tags: string[];
  language: string;
  contentType: ContentTypeValue;
  definition?: string;
  ipa?: string;
  examples?: string[];
  partOfSpeech?: string;
}

/**
 * Props for the VocabForm component.
 */
export interface VocabFormProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (data: Partial<Vocabulary> & VocabFormData) => void | Promise<void>;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Initial data for editing an existing vocabulary */
  initialData?: Vocabulary;
  /** Whether the form is in a loading state */
  loading?: boolean;
  /** Hide the content type selector (when type is pre-determined) */
  hideContentType?: boolean;
  /** Additional CSS classes for the form container */
  className?: string;
}

/**
 * Form validation errors structure.
 */
interface FormErrors {
  text?: string;
}

/**
 * Content type options for the select dropdown.
 */
const CONTENT_TYPE_OPTIONS: { value: ContentTypeValue; label: string }[] = [
  { value: ContentType.VOCABULARY, label: 'Vocabulary' },
  { value: ContentType.IDIOM, label: 'Idiom' },
  { value: ContentType.PHRASAL_VERB, label: 'Phrasal Verb' },
  { value: ContentType.QUOTE, label: 'Quote' },
];

/**
 * VocabForm organism component for creating and editing vocabulary entries.
 *
 * Features:
 * - Form fields for text, language, content type, description
 * - TagInput integration for managing tags
 * - GPT enrichment trigger to auto-fill definition, IPA, examples
 * - Form validation with error messages
 * - Edit mode support with pre-populated data
 * - Loading state handling
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * // Create mode
 * <VocabForm onSubmit={handleCreate} />
 *
 * // Edit mode
 * <VocabForm
 *   initialData={existingVocab}
 *   onSubmit={handleUpdate}
 *   onCancel={() => navigate(-1)}
 * />
 *
 * // With loading state
 * <VocabForm
 *   onSubmit={handleSubmit}
 *   loading={isSaving}
 * />
 * ```
 */
export const VocabForm = ({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
  hideContentType = false,
  className = '',
}: VocabFormProps) => {
  const formId = useId();
  const isEditMode = Boolean(initialData?.id);

  // Form state
  const [text, setText] = useState(initialData?.text ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [language, setLanguage] = useState(initialData?.language ?? DEFAULT_LANGUAGE_CODE);
  const [contentType, setContentType] = useState<ContentTypeValue>(
    initialData?.contentType ?? ContentType.VOCABULARY
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);

  // Enrichment data (from GPT)
  const [definition, setDefinition] = useState(initialData?.definition);
  const [ipa, setIpa] = useState(initialData?.ipa);
  const [examples, setExamples] = useState(initialData?.examples);
  const [partOfSpeech, setPartOfSpeech] = useState(initialData?.partOfSpeech);

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  /**
   * Validates the form and returns true if valid.
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!text.trim()) {
      newErrors.text = 'Text is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [text]);

  /**
   * Handles form submission.
   */
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      const formData: Partial<Vocabulary> & VocabFormData = {
        text: text.trim(),
        description: description.trim() || undefined,
        tags,
        language,
        contentType,
        definition,
        ipa,
        examples,
        partOfSpeech,
      };

      // Preserve existing data in edit mode
      if (initialData) {
        formData.id = initialData.id;
        formData.createdAt = initialData.createdAt;
      }

      await onSubmit(formData);
    },
    [
      text,
      description,
      tags,
      language,
      contentType,
      definition,
      ipa,
      examples,
      partOfSpeech,
      initialData,
      onSubmit,
      validateForm,
    ]
  );

  /**
   * Handles text input change and clears error.
   */
  const handleTextChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    setErrors((prev) => ({ ...prev, text: undefined }));
    setEnrichError(null);
  }, []);

  /**
   * Handles paste button click - reads clipboard and sets text value.
   */
  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText.trim());
        setErrors((prev) => ({ ...prev, text: undefined }));
        setEnrichError(null);
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, []);

  /**
   * Handles description input change.
   */
  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value);
    },
    []
  );

  /**
   * Handles language select change.
   */
  const handleLanguageChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  }, []);

  /**
   * Handles content type select change.
   */
  const handleContentTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setContentType(e.target.value as ContentTypeValue);
    },
    []
  );

  // Network status for offline detection
  const { isOffline } = useNetworkStatus();

  /**
   * Triggers GPT enrichment for the current text.
   * Handles offline scenarios gracefully.
   */
  const handleEnrich = useCallback(async () => {
    if (!text.trim()) {
      return;
    }

    // Check if offline before attempting
    if (isOffline) {
      setEnrichError('You are offline. AI enrichment requires an internet connection.');
      return;
    }

    setIsEnriching(true);
    setEnrichError(null);

    try {
      const gpt = gptService();
      const enrichment = await gpt.enrich(text.trim(), language);

      setDefinition(enrichment.definition);
      setIpa(enrichment.ipa);
      setExamples(enrichment.examples);
      setPartOfSpeech(enrichment.type);
    } catch (error) {
      // Use graceful error message
      const message = getNetworkErrorMessage(error, 'Failed to enrich vocabulary');
      setEnrichError(message);
    } finally {
      setIsEnriching(false);
    }
  }, [text, language, isOffline]);

  const canEnrich = text.trim().length > 0 && !loading && !isEnriching && !isOffline;
  const isFormDisabled = loading;

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className={`space-y-6 ${className}`}
      noValidate
    >
      {/* Text Input with Paste Button */}
      <div>
        <label 
          htmlFor={`${formId}-text`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Text <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              id={`${formId}-text`}
              value={text}
              onChange={handleTextChange}
              placeholder="Enter word, phrase, or expression"
              error={errors.text}
              disabled={isFormDisabled}
              fullWidth
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handlePaste}
            disabled={isFormDisabled}
            title="Paste from clipboard"
            aria-label="Paste from clipboard"
            className="shrink-0"
          >
            <Icon name="clipboard" size="sm" />
          </Button>
        </div>
      </div>

      {/* Language and Content Type Row */}
      <div className={`grid gap-4 ${hideContentType ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {/* Language Select */}
        <div>
          <label
            htmlFor={`${formId}-language`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Language
          </label>
          <select
            id={`${formId}-language`}
            value={language}
            onChange={handleLanguageChange}
            disabled={isFormDisabled}
            className="w-full px-4 py-2 text-base border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content Type Select - hidden when type is pre-determined */}
        {!hideContentType && (
          <div>
            <label
              htmlFor={`${formId}-contentType`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Content Type
            </label>
            <select
              id={`${formId}-contentType`}
              value={contentType}
              onChange={handleContentTypeChange}
              disabled={isFormDisabled}
              className="w-full px-4 py-2 text-base border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {CONTENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Description Textarea */}
      <div>
        <label
          htmlFor={`${formId}-description`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Description
        </label>
        <textarea
          id={`${formId}-description`}
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Add your own notes or description"
          disabled={isFormDisabled}
          rows={3}
          className="w-full px-4 py-2 text-base border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y"
        />
      </div>

      {/* Tags Input */}
      <TagInput
        label="Tags"
        tags={tags}
        onChange={setTags}
        placeholder="Type and press Enter..."
        disabled={isFormDisabled}
        helperText="Add tags to categorize your vocabulary"
      />

      {/* GPT Enrichment Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            AI Enrichment
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEnrich}
            disabled={!canEnrich}
            loading={isEnriching}
          >
            {isEnriching ? 'Enriching...' : 'Enrich with AI'}
          </Button>
        </div>

        {/* Enrichment Error */}
        {enrichError && (
          <p className="text-sm text-red-500 mb-3" role="alert">
            {enrichError}
          </p>
        )}

        {/* Enrichment Results Preview */}
        {(definition || ipa || partOfSpeech || (examples && examples.length > 0)) && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2 text-sm">
            {partOfSpeech && (
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Part of Speech:
                </span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{partOfSpeech}</span>
              </p>
            )}
            {ipa && (
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">IPA:</span>{' '}
                <span className="text-gray-600 dark:text-gray-400 font-mono">{ipa}</span>
              </p>
            )}
            {definition && (
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Definition:
                </span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{definition}</span>
              </p>
            )}
            {examples && examples.length > 0 && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Examples:
                </span>
                <ul className="mt-1 list-disc list-inside text-gray-600 dark:text-gray-400">
                  {examples.map((example, index) => (
                    <li key={index}>{example}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading} disabled={isEnriching}>
          {loading ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
