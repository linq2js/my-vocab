import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModalLayout } from './ModalLayout';

describe('ModalLayout', () => {
  it('renders children when open', () => {
    render(
      <ModalLayout isOpen={true} onClose={vi.fn()}>
        <div>Modal Content</div>
      </ModalLayout>
    );

    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ModalLayout isOpen={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </ModalLayout>
    );

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <ModalLayout isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </ModalLayout>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ModalLayout isOpen={true} onClose={onClose}>
        <div>Content</div>
      </ModalLayout>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(
      <ModalLayout isOpen={true} onClose={onClose}>
        <div>Content</div>
      </ModalLayout>
    );

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal container is clicked', () => {
    const onClose = vi.fn();
    render(
      <ModalLayout isOpen={true} onClose={onClose}>
        <div>Content</div>
      </ModalLayout>
    );

    const container = screen.getByTestId('modal-container');
    fireEvent.click(container);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <ModalLayout isOpen={true} onClose={onClose}>
        <div>Content</div>
      </ModalLayout>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closed', () => {
    const onClose = vi.fn();
    render(
      <ModalLayout isOpen={false} onClose={onClose}>
        <div>Content</div>
      </ModalLayout>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies small size class', () => {
    render(
      <ModalLayout isOpen={true} onClose={vi.fn()} size="sm">
        <div>Content</div>
      </ModalLayout>
    );

    const container = screen.getByTestId('modal-container');
    expect(container).toHaveClass('max-w-sm');
  });

  it('applies medium size class by default', () => {
    render(
      <ModalLayout isOpen={true} onClose={vi.fn()}>
        <div>Content</div>
      </ModalLayout>
    );

    const container = screen.getByTestId('modal-container');
    expect(container).toHaveClass('max-w-md');
  });

  it('applies large size class', () => {
    render(
      <ModalLayout isOpen={true} onClose={vi.fn()} size="lg">
        <div>Content</div>
      </ModalLayout>
    );

    const container = screen.getByTestId('modal-container');
    expect(container).toHaveClass('max-w-lg');
  });

  it('applies extra large size class', () => {
    render(
      <ModalLayout isOpen={true} onClose={vi.fn()} size="xl">
        <div>Content</div>
      </ModalLayout>
    );

    const container = screen.getByTestId('modal-container');
    expect(container).toHaveClass('max-w-xl');
  });

  it('has correct accessibility attributes', () => {
    render(
      <ModalLayout isOpen={true} onClose={vi.fn()} title="Accessible Modal">
        <div>Content</div>
      </ModalLayout>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('cleans up event listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <ModalLayout isOpen={true} onClose={onClose}>
        <div>Content</div>
      </ModalLayout>
    );

    unmount();

    // After unmount, pressing Escape should not call onClose
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
