/**
 * AddVocabPage component for MyVocab PWA.
 *
 * Page for adding new vocabulary entries with form validation and GPT enrichment.
 * Integrates with vocabStore for data persistence.
 *
 * Features:
 * - VocabForm integration for vocabulary creation
 * - Navigation back to home page using React Router
 * - Loading state during save operation
 * - Full dark mode support
 *
 * @example
 * ```tsx
 * // Basic usage in router
 * <Route path="/add" element={<AddVocabPage />} />
 * ```
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { PageLayout } from '../components/templates/PageLayout';
import { VocabForm, type VocabFormData } from '../components/organisms/VocabForm';
import { Icon } from '../components/atoms/Icon';
import { vocabStore } from '../stores/vocab.store';
import type { Vocabulary, ContentType } from '../types/vocabulary';

/**
 * Content type configuration for display
 */
interface ContentTypeConfig {
  title: string;
  description: string;
  contentType: ContentType;
}

/**
 * Map of URL type parameter to content type configuration
 */
const CONTENT_TYPE_CONFIG: Record<string, ContentTypeConfig> = {
  word: {
    title: 'Add Vocabulary',
    description: 'Add a new word or phrase to your collection.',
    contentType: 'vocabulary',
  },
  vocabulary: {
    title: 'Add Vocabulary',
    description: 'Add a new word or phrase to your collection.',
    contentType: 'vocabulary',
  },
  idiom: {
    title: 'Add Idiom',
    description: 'Add a new idiom or expression to your collection.',
    contentType: 'idiom',
  },
  'phrasal-verb': {
    title: 'Add Phrasal Verb',
    description: 'Add a new phrasal verb to your collection.',
    contentType: 'phrasal-verb',
  },
};

/**
 * AddVocabPage component - page for adding/editing vocabulary entries.
 *
 * @returns The AddVocabPage component
 */
export const AddVocabPage = (): React.ReactElement => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get content type, text, and edit ID from URL parameters
  const typeParam = searchParams.get('type') || 'word';
  const textParam = searchParams.get('text') || '';
  const editId = searchParams.get('edit');
  
  // Determine if we're in edit mode
  const isEditMode = Boolean(editId);
  
  // Get vocabulary to edit (if in edit mode)
  const vocabularyToEdit = useMemo(() => {
    if (!editId) return null;
    return vocabStore.getById(editId);
  }, [editId]);

  const config = useMemo(() => {
    // In edit mode, use the vocabulary's content type
    if (vocabularyToEdit) {
      const typeKey = vocabularyToEdit.contentType;
      return CONTENT_TYPE_CONFIG[typeKey] || CONTENT_TYPE_CONFIG.word;
    }
    return CONTENT_TYPE_CONFIG[typeParam] || CONTENT_TYPE_CONFIG.word;
  }, [typeParam, vocabularyToEdit]);

  // Build initial data from URL parameters or existing vocabulary
  const initialData = useMemo(() => {
    if (vocabularyToEdit) {
      return vocabularyToEdit;
    }
    return {
      contentType: config?.contentType ?? 'vocabulary',
      text: textParam,
    } as Vocabulary;
  }, [config?.contentType, textParam, vocabularyToEdit]);

  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Navigate back to home page.
   */
  const navigateHome = useCallback((): void => {
    navigate('/');
  }, [navigate]);

  /**
   * Handle form submission - add or update vocabulary and navigate home.
   *
   * @param data - Form data from VocabForm
   */
  const handleSubmit = useCallback(
    async (data: Partial<Vocabulary> & VocabFormData): Promise<void> => {
      setIsSaving(true);

      try {
        const vocabData = {
          text: data.text,
          description: data.description,
          tags: data.tags,
          language: data.language,
          contentType: data.contentType,
          definition: data.definition,
          ipa: data.ipa,
          examples: data.examples,
          partOfSpeech: data.partOfSpeech,
          forms: data.forms,
          extra: data.extra,
        };

        if (isEditMode && vocabularyToEdit) {
          // Update existing vocabulary - merge with existing data
          await vocabStore.update({
            ...vocabularyToEdit,
            ...vocabData,
          });
        } else {
          // Add new vocabulary
          await vocabStore.add(vocabData);
        }

        // Navigate home on success
        navigateHome();
      } catch (error) {
        // Log error but don't throw - form will show error state
        console.error(`Failed to ${isEditMode ? 'update' : 'add'} vocabulary:`, error);
      } finally {
        setIsSaving(false);
      }
    },
    [navigateHome, isEditMode, vocabularyToEdit]
  );

  /**
   * Handle cancel - navigate back to home.
   */
  const handleCancel = useCallback((): void => {
    navigateHome();
  }, [navigateHome]);

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          {/* Title with Back Icon */}
          <div className="flex items-center gap-4 mb-2">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Back to home"
            >
              <Icon name="chevron-left" size="md" />
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isEditMode 
                ? `Edit ${config?.title?.replace('Add ', '') ?? 'Vocabulary'}`
                : (config?.title ?? 'Add Vocabulary')
              }
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">
            {isEditMode
              ? `Update this ${config?.contentType ?? 'vocabulary'} entry.`
              : (config?.description ?? 'Add a new word or phrase to your collection.')
            }
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <VocabForm
            key={`${config?.contentType ?? 'vocabulary'}-${textParam}`}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={isSaving}
            hideContentType={Boolean(searchParams.get('type'))}
          />
        </div>
      </div>
    </PageLayout>
  );
};
