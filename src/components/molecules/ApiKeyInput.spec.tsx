import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeyInput } from './ApiKeyInput';

describe('ApiKeyInput', () => {
  const mockOnChange = vi.fn();
  const mockOnTest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByLabelText(/toggle.*visibility/i)).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(
        <ApiKeyInput value="" onChange={mockOnChange} label="OpenAI API Key" />
      );

      expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(
        <ApiKeyInput
          value=""
          onChange={mockOnChange}
          placeholder="Enter your API key"
        />
      );

      expect(screen.getByPlaceholderText('Enter your API key')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(
        <ApiKeyInput
          value=""
          onChange={mockOnChange}
          helperText="Your API key is stored locally"
        />
      );

      expect(screen.getByText('Your API key is stored locally')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(
        <ApiKeyInput
          value=""
          onChange={mockOnChange}
          error="Invalid API key format"
        />
      );

      expect(screen.getByText('Invalid API key format')).toBeInTheDocument();
    });

    it('renders test button when onTest is provided', () => {
      render(
        <ApiKeyInput value="test-key" onChange={mockOnChange} onTest={mockOnTest} />
      );

      expect(screen.getByRole('button', { name: /test/i })).toBeInTheDocument();
    });

    it('does not render test button when onTest is not provided', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} />);

      expect(screen.queryByRole('button', { name: /test/i })).not.toBeInTheDocument();
    });
  });

  describe('password visibility toggle', () => {
    it('hides input value by default (password type)', () => {
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('shows input value when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} />);

      const toggleButton = screen.getByLabelText(/toggle.*visibility/i);
      await user.click(toggleButton);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('hides input value when toggle is clicked twice', async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} />);

      const toggleButton = screen.getByLabelText(/toggle.*visibility/i);
      await user.click(toggleButton);
      await user.click(toggleButton);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('shows eye icon when password is hidden', () => {
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} />);

      // When hidden, should show "eye" icon (to reveal)
      const toggleButton = screen.getByLabelText(/toggle.*visibility/i);
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
    });

    it('shows eye-off icon when password is visible', async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} />);

      const toggleButton = screen.getByLabelText(/toggle.*visibility/i);
      await user.click(toggleButton);

      // When visible, should show "eye-off" icon (to hide)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('value handling', () => {
    it('displays the provided value', () => {
      render(<ApiKeyInput value="my-api-key" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('my-api-key');
    });

    it('calls onChange when input value changes', async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'new-key');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('passes the new value to onChange', async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'a');

      expect(mockOnChange).toHaveBeenCalledWith('a');
    });
  });

  describe('test API key button', () => {
    it('calls onTest when test button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ApiKeyInput value="test-key" onChange={mockOnChange} onTest={mockOnTest} />
      );

      const testButton = screen.getByRole('button', { name: /test/i });
      await user.click(testButton);

      expect(mockOnTest).toHaveBeenCalledTimes(1);
    });

    it('disables test button when value is empty', () => {
      render(
        <ApiKeyInput value="" onChange={mockOnChange} onTest={mockOnTest} />
      );

      const testButton = screen.getByRole('button', { name: /test/i });
      expect(testButton).toBeDisabled();
    });

    it('enables test button when value is not empty', () => {
      render(
        <ApiKeyInput value="some-key" onChange={mockOnChange} onTest={mockOnTest} />
      );

      const testButton = screen.getByRole('button', { name: /test/i });
      expect(testButton).not.toBeDisabled();
    });

    it('shows loading state when testing', () => {
      render(
        <ApiKeyInput
          value="test-key"
          onChange={mockOnChange}
          onTest={mockOnTest}
          testing={true}
        />
      );

      const testButton = screen.getByRole('button', { name: /testing/i });
      expect(testButton).toBeDisabled();
    });

    it('disables test button when testing', () => {
      render(
        <ApiKeyInput
          value="test-key"
          onChange={mockOnChange}
          onTest={mockOnTest}
          testing={true}
        />
      );

      const testButton = screen.getByRole('button', { name: /testing/i });
      expect(testButton).toBeDisabled();
    });
  });

  describe('validation', () => {
    it('shows validation error when provided', () => {
      render(
        <ApiKeyInput
          value="invalid"
          onChange={mockOnChange}
          error="API key must start with sk-"
        />
      );

      expect(screen.getByText("API key must start with sk-")).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('applies error styling to input when error is present', () => {
      render(
        <ApiKeyInput
          value="invalid"
          onChange={mockOnChange}
          error="Invalid key"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(
        <ApiKeyInput value="test-key" onChange={mockOnChange} disabled={true} />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('disables toggle button when disabled', () => {
      render(
        <ApiKeyInput value="test-key" onChange={mockOnChange} disabled={true} />
      );

      const toggleButton = screen.getByLabelText(/toggle.*visibility/i);
      expect(toggleButton).toBeDisabled();
    });

    it('disables test button when disabled', () => {
      render(
        <ApiKeyInput
          value="test-key"
          onChange={mockOnChange}
          onTest={mockOnTest}
          disabled={true}
        />
      );

      const testButton = screen.getByRole('button', { name: /test/i });
      expect(testButton).toBeDisabled();
    });
  });

  describe('sizes', () => {
    it('renders with small size', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} size="sm" />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with medium size (default)', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with large size', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} size="lg" />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible label', () => {
      render(
        <ApiKeyInput value="" onChange={mockOnChange} label="API Key" />
      );

      const input = screen.getByLabelText('API Key');
      expect(input).toBeInTheDocument();
    });

    it('associates error message with input via aria-describedby', () => {
      render(
        <ApiKeyInput
          value=""
          onChange={mockOnChange}
          error="Invalid key"
        />
      );

      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByRole('alert');

      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(errorMessage.id));
    });

    it('toggle button has accessible label', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);

      const toggleButton = screen.getByLabelText(/toggle.*visibility/i);
      expect(toggleButton).toBeInTheDocument();
    });

    it('test button has accessible label', () => {
      render(
        <ApiKeyInput value="key" onChange={mockOnChange} onTest={mockOnTest} />
      );

      const testButton = screen.getByRole('button', { name: /test/i });
      expect(testButton).toBeInTheDocument();
    });
  });

  describe('test result states', () => {
    it('shows success state after successful test', () => {
      render(
        <ApiKeyInput
          value="valid-key"
          onChange={mockOnChange}
          onTest={mockOnTest}
          testResult="success"
        />
      );

      expect(screen.getByText(/valid|success/i)).toBeInTheDocument();
    });

    it('shows error state after failed test', () => {
      render(
        <ApiKeyInput
          value="invalid-key"
          onChange={mockOnChange}
          onTest={mockOnTest}
          testResult="error"
        />
      );

      expect(screen.getByText(/invalid|failed|error/i)).toBeInTheDocument();
    });
  });
});
