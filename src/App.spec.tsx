import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the stores
vi.mock('./stores/vocab.store', () => ({
  vocabStore: {
    items$: { get: vi.fn(() => []) },
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    filter: vi.fn(() => []),
  },
}));

vi.mock('./stores/settings.store', () => ({
  settingsStore: {
    settings$: {
      get: vi.fn(() => ({
        providers: [],
        activeProviderId: 'openai',
        theme: 'system',
        defaultLanguage: 'en',
      })),
    },
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('./stores/ui.store', () => ({
  uiStore: {
    searchQuery$: { get: vi.fn(() => '') },
    filters$: { get: vi.fn(() => ({ language: null, contentType: null, tags: [] })) },
    hasActiveFilters: vi.fn(() => false),
    openModal: vi.fn(),
  },
}));

// Mock atomirx/react
vi.mock('atomirx/react', () => ({
  useSelector: vi.fn((atom$) => atom$.get()),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });

  it('should render the HomePage at root route', () => {
    render(<App />);
    // HomePage is rendered by default at "/"
    expect(screen.getByText('MyVocab')).toBeInTheDocument();
  });

  it('should have navigation links', () => {
    render(<App />);
    // Navigation should be present in PageLayout
    const desktopNav = screen.getByTestId('desktop-nav');
    expect(desktopNav).toBeInTheDocument();
  });
});
