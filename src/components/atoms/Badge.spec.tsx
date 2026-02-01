import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders as a span element', () => {
      render(<Badge>Status</Badge>);
      const badge = screen.getByText('Status');
      expect(badge.tagName).toBe('SPAN');
    });
  });

  describe('variants', () => {
    it('renders default variant with gray styling', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-gray-100');
    });

    it('renders primary variant with blue styling', () => {
      render(<Badge variant="primary">Primary</Badge>);
      const badge = screen.getByText('Primary');
      expect(badge).toHaveClass('bg-blue-100');
    });

    it('renders success variant with green styling', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('renders warning variant with yellow styling', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-yellow-100');
    });

    it('renders danger variant with red styling', () => {
      render(<Badge variant="danger">Danger</Badge>);
      const badge = screen.getByText('Danger');
      expect(badge).toHaveClass('bg-red-100');
    });

    it('renders info variant with cyan styling', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-cyan-100');
    });

    it('uses default variant when not specified', () => {
      render(<Badge>No Variant</Badge>);
      const badge = screen.getByText('No Variant');
      expect(badge).toHaveClass('bg-gray-100');
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('text-xs');
    });

    it('renders medium size (default)', () => {
      render(<Badge size="md">Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('text-sm');
    });

    it('renders large size', () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('text-base');
    });

    it('uses medium size when not specified', () => {
      render(<Badge>Default Size</Badge>);
      const badge = screen.getByText('Default Size');
      expect(badge).toHaveClass('text-sm');
    });
  });

  describe('dot indicator', () => {
    it('renders dot indicator when dot prop is true', () => {
      render(<Badge dot>With Dot</Badge>);
      const badge = screen.getByText('With Dot');
      const dot = badge.querySelector('[data-testid="badge-dot"]');
      expect(dot).toBeInTheDocument();
    });

    it('does not render dot indicator when dot prop is false', () => {
      render(<Badge dot={false}>No Dot</Badge>);
      const badge = screen.getByText('No Dot');
      const dot = badge.querySelector('[data-testid="badge-dot"]');
      expect(dot).not.toBeInTheDocument();
    });

    it('does not render dot indicator by default', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      const dot = badge.querySelector('[data-testid="badge-dot"]');
      expect(dot).not.toBeInTheDocument();
    });

    it('dot inherits variant color', () => {
      render(<Badge variant="success" dot>Success Dot</Badge>);
      const badge = screen.getByText('Success Dot');
      const dot = badge.querySelector('[data-testid="badge-dot"]');
      expect(dot).toHaveClass('bg-green-500');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      render(<Badge className="custom-class" variant="primary">Merged</Badge>);
      const badge = screen.getByText('Merged');
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('bg-blue-100');
    });
  });

  describe('HTML attributes', () => {
    it('passes through HTML attributes', () => {
      render(<Badge data-testid="custom-badge" id="badge-1">Attrs</Badge>);
      const badge = screen.getByTestId('custom-badge');
      expect(badge).toHaveAttribute('id', 'badge-1');
    });

    it('applies title attribute', () => {
      render(<Badge title="Badge tooltip">Tooltip</Badge>);
      const badge = screen.getByText('Tooltip');
      expect(badge).toHaveAttribute('title', 'Badge tooltip');
    });
  });

  describe('accessibility', () => {
    it('has appropriate role for status indicators', () => {
      render(<Badge>Status</Badge>);
      const badge = screen.getByText('Status');
      expect(badge).toHaveAttribute('role', 'status');
    });
  });
});
