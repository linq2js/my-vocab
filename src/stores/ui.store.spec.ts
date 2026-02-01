/**
 * Tests for UI Store
 *
 * Tests the UI state management for search, filters, and modals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUiStore,
  uiStore,
  type UiFilters,
  DEFAULT_FILTERS,
} from './ui.store';

describe('UI Store', () => {
  describe('createUiStore', () => {
    let store: ReturnType<typeof createUiStore>;

    beforeEach(() => {
      store = createUiStore();
    });

    describe('searchQuery$', () => {
      it('should initialize with empty search query', () => {
        expect(store.searchQuery$.get()).toBe('');
      });

      it('should update search query via setSearchQuery', () => {
        store.setSearchQuery('hello');
        expect(store.searchQuery$.get()).toBe('hello');
      });

      it('should trim whitespace from search query', () => {
        store.setSearchQuery('  hello world  ');
        expect(store.searchQuery$.get()).toBe('hello world');
      });

      it('should clear search query', () => {
        store.setSearchQuery('test');
        store.clearSearchQuery();
        expect(store.searchQuery$.get()).toBe('');
      });
    });

    describe('filters$', () => {
      it('should initialize with default filters', () => {
        expect(store.filters$.get()).toEqual(DEFAULT_FILTERS);
      });

      it('should update filters via setFilters', () => {
        const newFilters: Partial<UiFilters> = {
          language: 'en',
          predefinedTags: ['vocabulary'],
        };
        store.setFilters(newFilters);

        expect(store.filters$.get()).toEqual({
          ...DEFAULT_FILTERS,
          language: 'en',
          predefinedTags: ['vocabulary'],
        });
      });

      it('should merge partial filters with existing', () => {
        store.setFilters({ language: 'en' });
        store.setFilters({ predefinedTags: ['idiom'] });

        expect(store.filters$.get()).toEqual({
          ...DEFAULT_FILTERS,
          language: 'en',
          predefinedTags: ['idiom'],
        });
      });

      it('should reset filters to defaults', () => {
        store.setFilters({
          language: 'fr',
          predefinedTags: ['quote'],
          tags: ['test'],
        });
        store.resetFilters();

        expect(store.filters$.get()).toEqual(DEFAULT_FILTERS);
      });

      it('should check if filters are active', () => {
        expect(store.hasActiveFilters()).toBe(false);

        store.setFilters({ language: 'en' });
        expect(store.hasActiveFilters()).toBe(true);

        store.resetFilters();
        expect(store.hasActiveFilters()).toBe(false);
      });

      it('should detect active filters for predefinedTags', () => {
        store.setFilters({ predefinedTags: ['idiom'] });
        expect(store.hasActiveFilters()).toBe(true);
      });

      it('should detect active filters for tags', () => {
        store.setFilters({ tags: ['important'] });
        expect(store.hasActiveFilters()).toBe(true);
      });
    });

    describe('modalState$', () => {
      it('should initialize with closed modal state', () => {
        expect(store.modalState$.get()).toEqual({
          isOpen: false,
          type: null,
          data: null,
        });
      });

      it('should open modal with type', () => {
        store.openModal('addVocab');

        expect(store.modalState$.get()).toEqual({
          isOpen: true,
          type: 'addVocab',
          data: null,
        });
      });

      it('should open modal with type and data', () => {
        const vocabData = { id: 'vocab_123', text: 'test' };
        store.openModal('editVocab', vocabData);

        expect(store.modalState$.get()).toEqual({
          isOpen: true,
          type: 'editVocab',
          data: vocabData,
        });
      });

      it('should close modal and clear state', () => {
        store.openModal('settings', { tab: 'providers' });
        store.closeModal();

        expect(store.modalState$.get()).toEqual({
          isOpen: false,
          type: null,
          data: null,
        });
      });

      it('should check if modal is open', () => {
        expect(store.isModalOpen()).toBe(false);

        store.openModal('confirm');
        expect(store.isModalOpen()).toBe(true);

        store.closeModal();
        expect(store.isModalOpen()).toBe(false);
      });

      it('should check if specific modal type is open', () => {
        store.openModal('addVocab');

        expect(store.isModalOpen('addVocab')).toBe(true);
        expect(store.isModalOpen('editVocab')).toBe(false);
      });
    });

    describe('reset', () => {
      it('should reset all UI state', () => {
        // Set various states
        store.setSearchQuery('test query');
        store.setFilters({ language: 'en', predefinedTags: ['idiom'] });
        store.openModal('settings', { tab: 'theme' });

        // Reset all
        store.reset();

        expect(store.searchQuery$.get()).toBe('');
        expect(store.filters$.get()).toEqual(DEFAULT_FILTERS);
        expect(store.modalState$.get()).toEqual({
          isOpen: false,
          type: null,
          data: null,
        });
      });
    });
  });

  describe('default uiStore instance', () => {
    it('should export a default store instance', () => {
      expect(uiStore).toBeDefined();
      expect(uiStore.searchQuery$).toBeDefined();
      expect(uiStore.filters$).toBeDefined();
      expect(uiStore.modalState$).toBeDefined();
      expect(typeof uiStore.setSearchQuery).toBe('function');
      expect(typeof uiStore.setFilters).toBe('function');
      expect(typeof uiStore.openModal).toBe('function');
    });
  });
});
