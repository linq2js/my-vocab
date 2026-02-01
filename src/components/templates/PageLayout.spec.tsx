import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PageLayout } from './PageLayout';

/**
 * Helper to render PageLayout with Router context.
 * @param children - Children to render
 * @param initialEntries - Initial route entries
 */
const renderWithRouter = (
  children: React.ReactNode,
  initialEntries: string[] = ['/']
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
};

describe('PageLayout', () => {
  describe('Header', () => {
    it('should render the app title', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('MyVocab')).toBeInTheDocument();
    });

    it('should render a custom title when provided', () => {
      renderWithRouter(
        <PageLayout title="Custom Title">
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render the title as a link to home', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      const titleLink = screen.getByRole('link', { name: /myvocab/i });
      expect(titleLink).toHaveAttribute('href', '/');
    });
  });

  describe('Navigation', () => {
    it('should render navigation links', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      // Check desktop navigation has all links
      const desktopNav = screen.getByTestId('desktop-nav');
      expect(desktopNav.querySelector('a[href="/"]')).toBeInTheDocument();
      expect(desktopNav.querySelector('a[href="/add"]')).toBeInTheDocument();
      expect(desktopNav.querySelector('a[href="/settings"]')).toBeInTheDocument();
    });

    it('should highlight the home link when on home route', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        ['/']
      );

      const desktopNav = screen.getByTestId('desktop-nav');
      const homeLink = desktopNav.querySelector('a[href="/"]');
      expect(homeLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight the add link when on add route', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        ['/add']
      );

      const desktopNav = screen.getByTestId('desktop-nav');
      const addLink = desktopNav.querySelector('a[href="/add"]');
      expect(addLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight the settings link when on settings route', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>,
        ['/settings']
      );

      const desktopNav = screen.getByTestId('desktop-nav');
      const settingsLink = desktopNav.querySelector('a[href="/settings"]');
      expect(settingsLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Mobile Menu', () => {
    it('should render a mobile menu button', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    it('should toggle mobile menu when button is clicked', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      const menuButton = screen.getByRole('button', { name: /menu/i });
      
      // Menu should be hidden initially
      const mobileNav = screen.getByTestId('mobile-nav');
      expect(mobileNav).toHaveClass('hidden');

      // Click to open
      fireEvent.click(menuButton);
      expect(mobileNav).not.toHaveClass('hidden');

      // Click to close
      fireEvent.click(menuButton);
      expect(mobileNav).toHaveClass('hidden');
    });

    it('should close mobile menu when a link is clicked', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(menuButton);

      const mobileNav = screen.getByTestId('mobile-nav');
      expect(mobileNav).not.toHaveClass('hidden');

      // Click a link in mobile nav
      const mobileLinks = mobileNav.querySelectorAll('a');
      const firstLink = mobileLinks[0];
      if (firstLink) {
        fireEvent.click(firstLink);
      }

      expect(mobileNav).toHaveClass('hidden');
    });
  });

  describe('Content', () => {
    it('should render children content', () => {
      renderWithRouter(
        <PageLayout>
          <div data-testid="test-content">Test Content</div>
        </PageLayout>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render content in main element', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper landmark roles', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      // Multiple navigation elements exist (desktop and mobile)
      expect(screen.getAllByRole('navigation').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have accessible navigation labels', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      // Both desktop and mobile nav should have accessible labels
      const navElements = screen.getAllByRole('navigation', { name: /main/i });
      expect(navElements.length).toBe(2); // desktop and mobile
    });
  });

  describe('Responsive behavior', () => {
    it('should have desktop navigation hidden on mobile', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      const desktopNav = screen.getByTestId('desktop-nav');
      expect(desktopNav).toHaveClass('hidden', 'md:flex');
    });

    it('should have mobile menu button hidden on desktop', () => {
      renderWithRouter(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      const menuButton = screen.getByRole('button', { name: /menu/i });
      expect(menuButton).toHaveClass('md:hidden');
    });
  });
});
