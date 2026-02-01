import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../atoms';

/**
 * Navigation page identifiers
 */
export type PageId = 'home' | 'add' | 'settings';

/**
 * Navigation link configuration
 */
interface NavLink {
  id: PageId;
  label: string;
  to: string;
  icon: 'book' | 'plus' | 'settings';
}

/**
 * Props for the PageLayout component
 */
export interface PageLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Custom title for the header (defaults to "MyVocab") */
  title?: string;
}

/**
 * Navigation links configuration
 * Note: "Add" is handled by FAB on HomePage, not in navigation
 */
const navLinks: NavLink[] = [
  { id: 'home', label: 'Home', to: '/', icon: 'book' },
  { id: 'settings', label: 'Settings', to: '/settings', icon: 'settings' },
];

/**
 * Determines the active page based on the current pathname.
 * @param pathname - The current URL pathname
 * @returns The PageId corresponding to the current route
 */
const getActivePageFromPath = (pathname: string): PageId => {
  if (pathname === '/add') return 'add';
  if (pathname === '/settings') return 'settings';
  return 'home';
};

/**
 * Main page layout component with header and navigation.
 * Uses React Router for client-side navigation.
 * Provides a consistent layout structure for all pages with:
 * - Header with app title
 * - Desktop navigation bar with React Router Links
 * - Responsive mobile menu with hamburger toggle
 * - Main content area
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PageLayout>
 *   <HomePage />
 * </PageLayout>
 *
 * // With custom title
 * <PageLayout title="My Custom App">
 *   <Content />
 * </PageLayout>
 * ```
 */
export const PageLayout = ({
  children,
  title = 'MyVocab',
}: PageLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const activePage = getActivePageFromPath(location.pathname);

  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = (): void => {
    setIsMobileMenuOpen(false);
  };

  const getLinkClasses = (isActive: boolean, isMobile: boolean): string => {
    const baseClasses = 'flex items-center gap-2 font-medium transition-colors duration-200';
    
    if (isMobile) {
      return `${baseClasses} px-4 py-3 w-full ${
        isActive
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      }`;
    }

    return `${baseClasses} px-3 py-2 rounded-lg ${
      isActive
        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
    }`;
  };

  return (
    <div className="min-h-screen h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <Link to="/" className="flex items-center gap-2">
              <Icon name="book" size="lg" color="primary" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <nav
              aria-label="Main navigation"
              data-testid="desktop-nav"
              className="hidden md:flex items-center gap-1"
            >
              {navLinks.map((link) => {
                const isActive = activePage === link.id;
                return (
                  <Link
                    key={link.id}
                    to={link.to}
                    className={getLinkClasses(isActive, false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon name={link.icon} size="sm" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size="md" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav
          id="mobile-menu"
          data-testid="mobile-nav"
          aria-label="Main navigation"
          className={`${
            isMobileMenuOpen ? '' : 'hidden'
          } md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}
        >
          <div className="py-2">
            {navLinks.map((link) => {
              const isActive = activePage === link.id;
              return (
                <Link
                  key={link.id}
                  to={link.to}
                  className={getLinkClasses(isActive, true)}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={closeMobileMenu}
                >
                  <Icon name={link.icon} size="sm" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-safe">
        {children}
      </main>
    </div>
  );
};
