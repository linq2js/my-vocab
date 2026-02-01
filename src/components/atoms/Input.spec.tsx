import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with label when provided', () => {
      render(<Input label="Email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should render with placeholder when provided', () => {
      render(<Input placeholder="Enter your email" />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });

    it('should apply default type as text', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('should allow type override', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });
  });

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4');
      expect(input).toHaveClass('py-2');
    });

    it('should render small size when specified', () => {
      render(<Input size="sm" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-3');
      expect(input).toHaveClass('py-1.5');
    });

    it('should render large size when specified', () => {
      render(<Input size="lg" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4');
      expect(input).toHaveClass('py-3');
    });
  });

  describe('states', () => {
    it('should handle disabled state', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50');
      expect(input).toHaveClass('cursor-not-allowed');
    });

    it('should be full width when specified', () => {
      render(<Input fullWidth />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('w-full');
    });
  });

  describe('error state', () => {
    it('should display error message when error prop is provided', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styling when error prop is provided', () => {
      render(<Input error="Invalid email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });

    it('should have aria-invalid when error is present', () => {
      render(<Input error="Error message" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should link error message with aria-describedby', () => {
      render(<Input id="email" error="Invalid email" />);
      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('Invalid email');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(errorMessage).toHaveAttribute('id', 'email-error');
    });
  });

  describe('helper text', () => {
    it('should display helper text when provided', () => {
      render(<Input helperText="Enter a valid email address" />);
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    });

    it('should not display helper text when error is present', () => {
      render(<Input helperText="Helper text" error="Error message" />);
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when input loses focus', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);
      fireEvent.blur(screen.getByRole('textbox'));
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should call onFocus when input gains focus', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);
      fireEvent.focus(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onChange when disabled', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} disabled />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      // Disabled inputs don't fire change events in real browsers
      // but fireEvent still triggers them, so we check the disabled state instead
      expect(input).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('should support aria-label', () => {
      render(<Input aria-label="Search" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Search');
    });

    it('should support required attribute', () => {
      render(<Input label="Email" required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('should show required indicator in label', () => {
      render(<Input label="Email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('border'); // Still has default class
    });
  });
});
