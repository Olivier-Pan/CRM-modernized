import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

const base = (size: number, color: string, style?: React.CSSProperties) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 1.85,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  style: { flexShrink: 0, ...style },
});

export const IconSearch = ({ size = 14, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconPlus = ({ size = 14, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)} strokeWidth={2.2}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconClose = ({ size = 14, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconChevronDown = ({ size = 12, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IconChevronRight = ({ size = 12, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const IconCheck = ({ size = 13, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)} strokeWidth={2.3}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconSun = ({ size = 14, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const IconMoon = ({ size = 14, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const IconUser = ({ size = 14, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconLogOut = ({ size = 14, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const IconMenu = ({ size = 15, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const IconSort = ({ size = 13, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="10" y1="18" x2="14" y2="18" />
  </svg>
);

export const IconMore = ({ size = 15, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

export const IconClock = ({ size = 14, color = 'currentColor', style }: IconProps) => (
  <svg {...base(size, color, style)}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);