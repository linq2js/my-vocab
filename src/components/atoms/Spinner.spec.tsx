import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  describe('rendering', () => {
    it('should render the spinner', () => {
      render(<Spinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<Spinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should render with custom label', () => {
      render(<Spinner label="Saving..." />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Saving...');
    });
  });

  describe('size variants', () => {
    it('should render with small size', () => {
      render(<Spinner size="sm" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('should render with medium size (default)', () => {
      render(<Spinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('should render with large size', () => {
      render(<Spinner size="lg" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('should render with extra large size', () => {
      render(<Spinner size="xl" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });
  });

  describe('color variants', () => {
    it('should render with primary color (default)', () => {
      render(<Spinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('text-blue-600');
    });

    it('should render with secondary color', () => {
      render(<Spinner color="secondary" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('text-gray-600');
    });

    it('should render with white color', () => {
      render(<Spinner color="white" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('text-white');
    });

    it('should render with current color', () => {
      render(<Spinner color="current" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('text-current');
    });
  });

  describe('animation', () => {
    it('should have spin animation class', () => {
      render(<Spinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<Spinner className="my-custom-class" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('my-custom-class');
    });

    it('should merge custom className with default classes', () => {
      render(<Spinner className="my-custom-class" size="lg" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin', 'h-8', 'w-8', 'my-custom-class');
    });
  });
});
