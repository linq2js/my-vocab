import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  describe('rendering', () => {
    it('should render an SVG element', () => {
      render(<Icon name="search" />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    it('should render the correct icon based on name prop', () => {
      render(<Icon name="search" data-testid="search-icon" />);
      const icon = screen.getByTestId('search-icon');
      expect(icon).toBeInTheDocument();
    });

    it('should have aria-hidden by default for decorative icons', () => {
      render(<Icon name="search" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should support aria-label for accessible icons', () => {
      render(<Icon name="search" aria-label="Search" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveAttribute('aria-label', 'Search');
      expect(icon).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('sizes', () => {
    it('should render small size when specified', () => {
      render(<Icon name="search" size="sm" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('w-4');
      expect(icon).toHaveClass('h-4');
    });

    it('should render medium size by default', () => {
      render(<Icon name="search" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('w-5');
      expect(icon).toHaveClass('h-5');
    });

    it('should render large size when specified', () => {
      render(<Icon name="search" size="lg" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('w-6');
      expect(icon).toHaveClass('h-6');
    });

    it('should render extra large size when specified', () => {
      render(<Icon name="search" size="xl" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('w-8');
      expect(icon).toHaveClass('h-8');
    });
  });

  describe('colors', () => {
    it('should use currentColor by default', () => {
      render(<Icon name="search" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('text-current');
    });

    it('should apply primary color when specified', () => {
      render(<Icon name="search" color="primary" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('text-blue-600');
    });

    it('should apply secondary color when specified', () => {
      render(<Icon name="search" color="secondary" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('text-gray-500');
    });

    it('should apply success color when specified', () => {
      render(<Icon name="search" color="success" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('text-green-600');
    });

    it('should apply danger color when specified', () => {
      render(<Icon name="search" color="danger" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('text-red-600');
    });

    it('should apply warning color when specified', () => {
      render(<Icon name="search" color="warning" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('text-yellow-600');
    });
  });

  describe('icon names', () => {
    it('should render search icon', () => {
      render(<Icon name="search" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render plus icon', () => {
      render(<Icon name="plus" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render close icon', () => {
      render(<Icon name="close" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render settings icon', () => {
      render(<Icon name="settings" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render trash icon', () => {
      render(<Icon name="trash" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render edit icon', () => {
      render(<Icon name="edit" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render check icon', () => {
      render(<Icon name="check" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render chevron-down icon', () => {
      render(<Icon name="chevron-down" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render chevron-up icon', () => {
      render(<Icon name="chevron-up" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render spinner icon', () => {
      render(<Icon name="spinner" data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Icon name="search" className="custom-class" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('custom-class');
      expect(icon).toHaveClass('w-5'); // Still has default size class
    });
  });

  describe('spinner animation', () => {
    it('should apply animation class to spinner icon', () => {
      render(<Icon name="spinner" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('animate-spin');
    });

    it('should not apply animation class to non-spinner icons', () => {
      render(<Icon name="search" data-testid="icon" />);
      const icon = screen.getByTestId('icon');
      expect(icon).not.toHaveClass('animate-spin');
    });
  });
});
