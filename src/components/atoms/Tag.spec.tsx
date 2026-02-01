import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tag } from './Tag';

describe('Tag', () => {
  describe('rendering', () => {
    it('should render children correctly', () => {
      render(<Tag>JavaScript</Tag>);
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('should render as a span element', () => {
      render(<Tag>Test</Tag>);
      const tag = screen.getByText('Test');
      expect(tag.tagName.toLowerCase()).toBe('span');
    });
  });

  describe('variants', () => {
    it('should render default variant by default', () => {
      render(<Tag>Default</Tag>);
      const tag = screen.getByText('Default');
      expect(tag).toHaveClass('bg-gray-100');
    });

    it('should render primary variant when specified', () => {
      render(<Tag variant="primary">Primary</Tag>);
      const tag = screen.getByText('Primary');
      expect(tag).toHaveClass('bg-blue-100');
    });

    it('should render success variant when specified', () => {
      render(<Tag variant="success">Success</Tag>);
      const tag = screen.getByText('Success');
      expect(tag).toHaveClass('bg-green-100');
    });

    it('should render warning variant when specified', () => {
      render(<Tag variant="warning">Warning</Tag>);
      const tag = screen.getByText('Warning');
      expect(tag).toHaveClass('bg-yellow-100');
    });

    it('should render danger variant when specified', () => {
      render(<Tag variant="danger">Danger</Tag>);
      const tag = screen.getByText('Danger');
      expect(tag).toHaveClass('bg-red-100');
    });
  });

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(<Tag>Medium</Tag>);
      const tag = screen.getByText('Medium');
      expect(tag).toHaveClass('px-2.5');
      expect(tag).toHaveClass('py-0.5');
    });

    it('should render small size when specified', () => {
      render(<Tag size="sm">Small</Tag>);
      const tag = screen.getByText('Small');
      expect(tag).toHaveClass('px-2');
      expect(tag).toHaveClass('py-0.5');
      expect(tag).toHaveClass('text-xs');
    });

    it('should render large size when specified', () => {
      render(<Tag size="lg">Large</Tag>);
      const tag = screen.getByText('Large');
      expect(tag).toHaveClass('px-3');
      expect(tag).toHaveClass('py-1');
    });
  });

  describe('removable variant', () => {
    it('should show remove button when removable is true', () => {
      render(<Tag removable>Removable</Tag>);
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should not show remove button when removable is false', () => {
      render(<Tag>Not Removable</Tag>);
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('should call onRemove when remove button is clicked', () => {
      const handleRemove = vi.fn();
      render(<Tag removable onRemove={handleRemove}>Removable</Tag>);
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('should not call onRemove when tag itself is clicked', () => {
      const handleRemove = vi.fn();
      render(<Tag removable onRemove={handleRemove}>Removable</Tag>);
      fireEvent.click(screen.getByText('Removable'));
      expect(handleRemove).not.toHaveBeenCalled();
    });

    it('should render remove icon with proper accessibility', () => {
      render(<Tag removable>Removable</Tag>);
      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton).toHaveAttribute('aria-label', 'Remove tag');
    });
  });

  describe('clickable variant', () => {
    it('should call onClick when tag is clicked', () => {
      const handleClick = vi.fn();
      render(<Tag onClick={handleClick}>Clickable</Tag>);
      fireEvent.click(screen.getByText('Clickable'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have cursor-pointer when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<Tag onClick={handleClick}>Clickable</Tag>);
      const tag = screen.getByText('Clickable');
      expect(tag).toHaveClass('cursor-pointer');
    });

    it('should have hover effect when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<Tag onClick={handleClick}>Clickable</Tag>);
      const tag = screen.getByText('Clickable');
      expect(tag).toHaveClass('hover:opacity-80');
    });
  });

  describe('accessibility', () => {
    it('should support custom aria-label', () => {
      render(<Tag aria-label="Custom label">Tag</Tag>);
      expect(screen.getByText('Tag')).toHaveAttribute('aria-label', 'Custom label');
    });
  });

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Tag className="custom-class">Custom</Tag>);
      const tag = screen.getByText('Custom');
      expect(tag).toHaveClass('custom-class');
      expect(tag).toHaveClass('bg-gray-100'); // Still has default variant class
    });
  });
});
