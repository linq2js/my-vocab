import { SVGAttributes } from 'react';

/**
 * Available icon names in the icon set
 */
export type IconName =
  | 'search'
  | 'plus'
  | 'close'
  | 'menu'
  | 'settings'
  | 'trash'
  | 'edit'
  | 'check'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'spinner'
  | 'filter'
  | 'tag'
  | 'book'
  | 'globe'
  | 'key'
  | 'eye'
  | 'eye-off'
  | 'copy'
  | 'clipboard'
  | 'volume'
  | 'info'
  | 'warning'
  | 'error'
  | 'download'
  | 'refresh'
  | 'play';

/**
 * Icon size options
 */
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Icon color options
 */
export type IconColor = 'current' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

/**
 * Props for the Icon component
 */
export interface IconProps extends Omit<SVGAttributes<SVGElement>, 'children'> {
  /** Name of the icon to render */
  name: IconName;
  /** Size of the icon */
  size?: IconSize;
  /** Color of the icon */
  color?: IconColor;
}

/**
 * SVG path data for each icon
 */
const iconPaths: Record<IconName, string> = {
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  plus: 'M12 4v16m8-8H4',
  close: 'M6 18L18 6M6 6l12 12',
  menu: 'M4 6h16M4 12h16M4 18h16',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  check: 'M5 13l4 4L19 7',
  'chevron-down': 'M19 9l-7 7-7-7',
  'chevron-up': 'M5 15l7-7 7 7',
  'chevron-left': 'M15 19l-7-7 7-7',
  'chevron-right': 'M9 5l7 7-7 7',
  spinner: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
  filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  globe: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
  key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  'eye-off': 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  volume: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  play: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

/**
 * Get size-specific CSS classes
 */
const getSizeClasses = (size: IconSize): string => {
  const sizes: Record<IconSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };
  return sizes[size];
};

/**
 * Get color-specific CSS classes
 */
const getColorClasses = (color: IconColor): string => {
  const colors: Record<IconColor, string> = {
    current: 'text-current',
    primary: 'text-blue-600',
    secondary: 'text-gray-500',
    success: 'text-green-600',
    danger: 'text-red-600',
    warning: 'text-yellow-600',
  };
  return colors[color];
};

/**
 * Reusable Icon component that renders SVG icons.
 * Supports multiple icon names, sizes, and colors.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Icon name="search" />
 *
 * // With size
 * <Icon name="plus" size="lg" />
 *
 * // With color
 * <Icon name="check" color="success" />
 *
 * // Accessible icon with label
 * <Icon name="settings" aria-label="Settings" />
 *
 * // Loading spinner
 * <Icon name="spinner" />
 * ```
 */
export const Icon = ({
  name,
  size = 'md',
  color = 'current',
  className = '',
  'aria-label': ariaLabel,
  ...props
}: IconProps) => {
  const sizeClasses = getSizeClasses(size);
  const colorClasses = getColorClasses(color);
  const isSpinner = name === 'spinner';

  const combinedClasses = [
    sizeClasses,
    colorClasses,
    isSpinner ? 'animate-spin' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // If aria-label is provided, the icon is accessible; otherwise it's decorative
  const accessibilityProps = ariaLabel
    ? { 'aria-label': ariaLabel, role: 'img' }
    : { 'aria-hidden': true as const, role: 'img' };

  // Special handling for spinner icon (uses fill instead of stroke)
  if (isSpinner) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        className={combinedClasses}
        {...accessibilityProps}
        {...props}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d={iconPaths[name]}
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={combinedClasses}
      {...accessibilityProps}
      {...props}
    >
      <path d={iconPaths[name]} />
    </svg>
  );
};
