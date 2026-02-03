import { useState, useCallback, useId, useMemo, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useSelector } from 'atomirx/react';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { TagInput } from '../molecules/TagInput';
import { LANGUAGES, DEFAULT_LANGUAGE_CODE } from '../../constants/languages';
import { PREDEFINED_TAGS, separateTags, matchPartOfSpeechToTag } from '../../constants/predefinedTags';
import { gptService } from '../../services/gpt.service';
import { settingsStore } from '../../stores/settings.store';
import { vocabStore } from '../../stores/vocab.store';
import { useNetworkStatus, getNetworkErrorMessage } from '../../hooks';
import type { Vocabulary, VocabularyForms, ExtraEnrichment, WordSense } from '../../types/vocabulary';

/**
 * Form data structure for vocabulary creation/editing.
 * Omits auto-generated fields like id and timestamps.
 */
export interface VocabFormData {
  text: string;
  description?: string;
  tags: string[];
  language: string;
  definition?: string;
  ipa?: string;
  examples?: string[];
  partOfSpeech?: string;
  baseForm?: string;
  forms?: VocabularyForms;
  extra?: ExtraEnrichment;
  senses?: WordSense[];
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
 * @param key - The form key (e.g., 'pastParticiple')
 * @returns The formatted label (e.g., 'Past Participle')
 */
function formatFormLabel(key: string): string {
  return FORM_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * VocabForm organism component for creating and editing vocabulary entries.
 *
 * Features:
 * - Form fields for text, language, description
 * - Predefined tag chips for quick categorization (idiom, phrasal verb, etc.)
 * - TagInput integration for custom tags
 * - GPT enrichment trigger with combined enrichment from predefined tags
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
 * ```
 */
export const VocabForm = ({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
  className = '',
}: VocabFormProps) => {
  const formId = useId();
  const isEditMode = Boolean(initialData?.id);

  // Subscribe to settings for reactive updates
  const settings = useSelector(settingsStore.settings$);
  
  // Track if we've applied last-used values (only once when settings load)
  const appliedLastUsed = useRef(false);

  // Separate initial tags into predefined and custom
  const initialTags = useMemo(() => {
    return separateTags(initialData?.tags ?? []);
  }, [initialData?.tags]);

  // Get all vocabulary items to compute available custom tags
  const allVocabularies = useSelector(vocabStore.items$);

  // Compute available custom tags from all vocabulary entries for autocomplete
  const availableCustomTags = useMemo(() => {
    const customTagSet = new Set<string>();
    for (const item of allVocabularies) {
      if (item.tags && item.tags.length > 0) {
        const { custom } = separateTags(item.tags);
        for (const tag of custom) {
          customTagSet.add(tag);
        }
      }
    }
    return Array.from(customTagSet).sort((a, b) => a.localeCompare(b));
  }, [allVocabularies]);

  // Form state
  const [text, setText] = useState(initialData?.text ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [language, setLanguage] = useState(
    initialData?.language ?? DEFAULT_LANGUAGE_CODE
  );
  // Predefined tags (idiom, phrasal-verb, etc.)
  const [selectedPredefinedTags, setSelectedPredefinedTags] = useState<string[]>(
    isEditMode ? initialTags.predefined : []
  );
  // Custom user tags
  const [customTags, setCustomTags] = useState<string[]>(initialTags.custom);

  // Enrichment data (from GPT)
  const [definition, setDefinition] = useState(initialData?.definition);
  const [ipa, setIpa] = useState(initialData?.ipa);
  const [examples, setExamples] = useState(initialData?.examples);
  const [partOfSpeech, setPartOfSpeech] = useState(initialData?.partOfSpeech);
  const [baseForm, setBaseForm] = useState(initialData?.baseForm);
  const [forms, setForms] = useState<VocabularyForms | undefined>(initialData?.forms);
  const [extra, setExtra] = useState<ExtraEnrichment | undefined>(initialData?.extra);
  const [senses, setSenses] = useState<WordSense[] | undefined>(initialData?.senses);

  // Extra enrichment request (user input for custom fields)
  const [extraRequest, setExtraRequest] = useState('');

  // Apply last-used values when settings load (only for new entries, only once)
  // Note: categories are intentionally NOT restored - user should select each time
  useEffect(() => {
    if (isEditMode || appliedLastUsed.current) return;
    
    // Check if settings have real values (not just defaults)
    const hasLoadedSettings = settings.lastUsedLanguage !== undefined;
    if (!hasLoadedSettings) return;
    
    appliedLastUsed.current = true;
    
    // Apply last-used values (language and extra enrichment only, not categories)
    const lastUsed = settingsStore.getLastUsedFormValues(settings.lastUsedLanguage);
    if (lastUsed.language) {
      setLanguage(lastUsed.language);
    }
    if (lastUsed.extraEnrichment) {
      setExtraRequest(lastUsed.extraEnrichment);
    }
  }, [isEditMode, settings]);

  // Update extra enrichment when language changes (load cached value for new language)
  const prevLanguageRef = useRef(language);
  useEffect(() => {
    if (isEditMode) return;
    if (prevLanguageRef.current === language) return;
    
    prevLanguageRef.current = language;
    const lastUsed = settingsStore.getLastUsedFormValues(language);
    setExtraRequest(lastUsed.extraEnrichment || '');
  }, [language, isEditMode]);

  // Get combined enrichment placeholder from selected predefined tags
  const extraPlaceholder = useMemo(() => {
    return settingsStore.getCombinedEnrichmentFromTags(selectedPredefinedTags);
  }, [selectedPredefinedTags]);

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  /**
   * Toggle a predefined tag selection.
   */
  const handlePredefinedTagToggle = useCallback((tagId: string) => {
    setSelectedPredefinedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  }, []);

  /**
   * Handle custom tags change from TagInput.
   * Filters out any predefined tags that might be typed.
   */
  const handleCustomTagsChange = useCallback((newTags: string[]) => {
    // If user types a predefined tag, add it to predefined selection instead
    const { predefined, custom } = separateTags(newTags);
    if (predefined.length > 0) {
      setSelectedPredefinedTags((prev) => {
        const combined = new Set([...prev, ...predefined]);
        return Array.from(combined);
      });
    }
    setCustomTags(custom);
  }, []);

  /**
   * Handle extra request input change.
   */
  const handleExtraRequestChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setExtraRequest(e.target.value);
  }, []);

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

      // Save last used values for new entries (fire and forget)
      // Note: categories are intentionally NOT persisted - user should select each time
      if (!isEditMode) {
        settingsStore.setLastUsedFormValues({
          language,
          extraEnrichment: { language, text: extraRequest },
        }).catch(() => {
          // Ignore errors - just a convenience feature
        });
      }

      // Combine predefined and custom tags
      const allTags = [...selectedPredefinedTags, ...customTags];

      const formData: Partial<Vocabulary> & VocabFormData = {
        text: text.trim(),
        description: description.trim() || undefined,
        tags: allTags,
        language,
        definition,
        ipa,
        examples,
        partOfSpeech,
        baseForm,
        forms,
        extra,
        senses,
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
      selectedPredefinedTags,
      customTags,
      language,
      definition,
      ipa,
      examples,
      partOfSpeech,
      baseForm,
      forms,
      extra,
      senses,
      extraRequest,
      initialData,
      isEditMode,
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
   * Also saves the language as the new default for future entries.
   */
  const handleLanguageChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    // Save as default for next time (fire and forget)
    settingsStore.setDefaultLanguage(newLanguage);
  }, []);

  // Network status for offline detection
  const { isOffline } = useNetworkStatus();

  /**
   * Triggers GPT enrichment for the current text.
   * Handles offline scenarios and missing API key gracefully.
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

      // Check if API key is configured before attempting enrichment
      const apiKeyStatus = await gpt.checkApiKeyStatus();
      if (!apiKeyStatus.isConfigured) {
        const providerName = apiKeyStatus.providerName || 'AI provider';
        setEnrichError(
          `Please configure your ${providerName} API key in Settings to use AI enrichment.`
        );
        return;
      }

      // Use custom extra request, or fall back to combined enrichment from predefined tags
      const extraFieldsToUse = extraRequest.trim() || extraPlaceholder || undefined;
      const enrichment = await gpt.enrich(text.trim(), language, extraFieldsToUse);

      setDefinition(enrichment.definition);
      setIpa(enrichment.ipa);
      setExamples(enrichment.examples);
      setPartOfSpeech(enrichment.type);
      setBaseForm(enrichment.baseForm);
      setForms(enrichment.forms);
      setExtra(enrichment.extra);
      setSenses(enrichment.senses);

      // Auto-select category if user hasn't selected any and AI returned a matching type
      if (selectedPredefinedTags.length === 0 && enrichment.type) {
        const matchedTag = matchPartOfSpeechToTag(enrichment.type);
        if (matchedTag) {
          setSelectedPredefinedTags([matchedTag]);
        }
      }
    } catch (error) {
      // Use graceful error message
      const message = getNetworkErrorMessage(error, 'Failed to enrich vocabulary');
      setEnrichError(message);
    } finally {
      setIsEnriching(false);
    }
  }, [text, language, isOffline, extraRequest, extraPlaceholder, selectedPredefinedTags]);

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

      {/* Predefined Tags Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_TAGS.map((tag) => {
            const isSelected = selectedPredefinedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handlePredefinedTagToggle(tag.id)}
                disabled={isFormDisabled}
                title={tag.description}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                  transition-colors duration-200 border
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <Icon name={tag.icon as any} size="sm" />
                {tag.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Select categories to get relevant AI enrichment. Multiple selections combine their fields.
        </p>
      </div>

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

        {/* Extra Fields Request Input */}
        <div className="mb-3">
          <Input
            value={extraRequest}
            onChange={handleExtraRequestChange}
            placeholder={extraPlaceholder || 'synonyms, antonyms, etymology...'}
            disabled={isFormDisabled || isEnriching}
            fullWidth
            size="sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Optional: Customize extra fields or leave empty to use category defaults.
          </p>
        </div>

        {/* Enrichment Error */}
        {enrichError && (
          <p className="text-sm text-red-500 mb-3" role="alert">
            {enrichError}
          </p>
        )}

        {/* Enrichment Results Preview */}
        {(definition || ipa || partOfSpeech || baseForm || (examples && examples.length > 0) || (forms && Object.keys(forms).length > 0) || (extra && Object.keys(extra).length > 0) || (senses && senses.length > 0)) && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2 text-sm">
            {/* Extra fields displayed FIRST (user-requested custom enrichment) */}
            {extra && Object.keys(extra).length > 0 && (
              <div className="border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                {Object.entries(extra).map(([key, value]) => (
                  value && (
                    <p key={key} className="mb-1">
                      <span className="font-medium text-purple-700 dark:text-purple-300 capitalize">
                        {key}:
                      </span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{value}</span>
                    </p>
                  )
                ))}
              </div>
            )}
            {baseForm && (
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Base Form:
                </span>{' '}
                <span className="text-gray-600 dark:text-gray-400 font-medium">{baseForm}</span>
              </p>
            )}
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
            {forms && Object.keys(forms).length > 0 && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Forms:
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Object.entries(forms).map(([key, value]) => (
                    value && (
                      <span
                        key={key}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs"
                      >
                        <span className="font-medium">{formatFormLabel(key)}:</span>
                        <span className="ml-1">{value}</span>
                      </span>
                    )
                  ))}
                </div>
              </div>
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
            {senses && senses.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Other Meanings:
                </span>
                <div className="mt-2 space-y-2">
                  {senses.map((sense, index) => (
                    <div key={index} className="pl-3 border-l-2 border-indigo-200 dark:border-indigo-700">
                      <p>
                        <span className="font-medium text-indigo-600 dark:text-indigo-400 italic">
                          {sense.type}:
                        </span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">{sense.definition}</span>
                      </p>
                      {sense.examples && sense.examples.length > 0 && (
                        <ul className="mt-1 list-disc list-inside text-gray-500 dark:text-gray-500 text-xs">
                          {sense.examples.map((ex, exIndex) => (
                            <li key={exIndex}>{ex}</li>
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
      </div>

      {/* Description Textarea */}
      <div>
        <label
          htmlFor={`${formId}-description`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          My Notes
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

      {/* Custom Tags Input */}
      <TagInput
        label="Custom Tags"
        tags={customTags}
        onChange={handleCustomTagsChange}
        placeholder="Type to search or add..."
        disabled={isFormDisabled}
        helperText="Type to see existing tags or add new ones"
        suggestions={availableCustomTags}
      />

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
