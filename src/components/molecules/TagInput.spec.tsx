import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from './TagInput';

describe('TagInput', () => {
  const defaultProps = {
    tags: ['react', 'typescript'],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<TagInput {...defaultProps} />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<TagInput {...defaultProps} label="Tags" />);
      
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<TagInput {...defaultProps} placeholder="Add a tag..." />);
      
      expect(screen.getByPlaceholderText('Add a tag...')).toBeInTheDocument();
    });

    it('should render empty state when no tags', () => {
      render(<TagInput tags={[]} onChange={defaultProps.onChange} />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('should render with error message', () => {
      render(<TagInput {...defaultProps} error="At least one tag required" />);
      
      expect(screen.getByText('At least one tag required')).toBeInTheDocument();
    });

    it('should render with helper text', () => {
      render(<TagInput {...defaultProps} helperText="Press Enter to add" />);
      
      expect(screen.getByText('Press Enter to add')).toBeInTheDocument();
    });

    it('should hide helper text when error is present', () => {
      render(
        <TagInput
          {...defaultProps}
          error="Error message"
          helperText="Helper text"
        />
      );
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('adding tags', () => {
    it('should add tag on Enter key', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'javascript{Enter}');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith([
        'react',
        'typescript',
        'javascript',
      ]);
    });

    it('should add tag on comma key', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'javascript,');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith([
        'react',
        'typescript',
        'javascript',
      ]);
    });

    it('should trim whitespace from tags', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, '  javascript  {Enter}');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith([
        'react',
        'typescript',
        'javascript',
      ]);
    });

    it('should not add empty tags', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, '   {Enter}');
      
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it('should not add duplicate tags', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'react{Enter}');
      
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it('should clear input after adding tag', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'javascript{Enter}');
      
      expect(input).toHaveValue('');
    });

    it('should respect maxTags limit', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} maxTags={2} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'javascript{Enter}');
      
      // Should not add because we already have 2 tags
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it('should disable input when maxTags reached', () => {
      render(<TagInput {...defaultProps} maxTags={2} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('removing tags', () => {
    it('should remove tag when clicking remove button', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith(['typescript']);
    });

    it('should remove last tag on Backspace when input is empty', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{Backspace}');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith(['react']);
    });

    it('should not remove tag on Backspace when input has value', async () => {
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      await user.keyboard('{Backspace}');
      
      // Should not call onChange for tag removal
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<TagInput {...defaultProps} disabled />);
      
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should not show remove buttons when disabled', () => {
      render(<TagInput {...defaultProps} disabled />);
      
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should render with small size', () => {
      render(<TagInput {...defaultProps} size="sm" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-sm');
    });

    it('should render with medium size (default)', () => {
      render(<TagInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-base');
    });

    it('should render with large size', () => {
      render(<TagInput {...defaultProps} size="lg" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-lg');
    });
  });

  describe('tag variants', () => {
    it('should apply tag variant to all tags', () => {
      render(<TagInput {...defaultProps} tagVariant="primary" />);
      
      const tags = screen.getAllByText(/react|typescript/);
      tags.forEach((tag) => {
        expect(tag.closest('span')).toHaveClass('bg-blue-100');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label on container', () => {
      render(<TagInput {...defaultProps} aria-label="Tag input" />);
      
      // The aria-label is passed to the input element
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Tag input');
    });

    it('should associate label with input', () => {
      render(<TagInput {...defaultProps} label="Tags" />);
      
      // Label is associated via htmlFor/id
      const label = screen.getByText('Tags');
      expect(label).toBeInTheDocument();
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.getAttribute('id'));
    });

    it('should have aria-invalid when error is present', () => {
      render(<TagInput {...defaultProps} error="Error" />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should announce tag count to screen readers', () => {
      render(<TagInput {...defaultProps} />);
      
      // There are two elements with "2 tags" - one sr-only for screen readers, one visible
      const tagCounts = screen.getAllByText('2 tags');
      expect(tagCounts).toHaveLength(2);
      
      // The sr-only one should have aria-live
      const srOnlyCount = tagCounts.find(el => el.classList.contains('sr-only'));
      expect(srOnlyCount).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('callbacks', () => {
    it('should call onBlur when input loses focus', async () => {
      const onBlur = vi.fn();
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} onBlur={onBlur} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();
      
      expect(onBlur).toHaveBeenCalled();
    });

    it('should call onFocus when input gains focus', async () => {
      const onFocus = vi.fn();
      const user = userEvent.setup();
      render(<TagInput {...defaultProps} onFocus={onFocus} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      expect(onFocus).toHaveBeenCalled();
    });
  });
});
