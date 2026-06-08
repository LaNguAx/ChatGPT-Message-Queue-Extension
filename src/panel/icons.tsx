type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
});

export function BrandMark({ className, size = 18 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="pqBrand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12b48c" />
          <stop offset="100%" stopColor="#0c8a68" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="30" fill="url(#pqBrand)" />
      <rect x="22" y="34" width="64" height="12" rx="6" fill="#fff" opacity="0.95" />
      <rect x="22" y="56" width="74" height="12" rx="6" fill="#fff" opacity="0.8" />
      <rect x="22" y="78" width="50" height="12" rx="6" fill="#fff" opacity="0.65" />
      <polygon points="84,82 110,98 84,114" fill="#fff" />
    </svg>
  );
}

export function SettingsIcon({ className, size = 16 }: IconProps) {
  return (
    <svg className={className} {...base(size)} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </svg>
  );
}

export function MinimizeIcon({ className, size = 16 }: IconProps) {
  return (
    <svg className={className} {...base(size)} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 12h12" />
    </svg>
  );
}

export function GripIcon({ className, size = 16 }: IconProps) {
  return (
    <svg className={className} {...base(size)} fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </svg>
  );
}

export function CloseIcon({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} {...base(size)} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ClockIcon({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} {...base(size)} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function SpinnerIcon({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} {...base(size)} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function CheckIcon({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} {...base(size)} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

export function AlertIcon({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} {...base(size)} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v5" />
      <path d="M12 16.5v.5" />
      <path d="M10.3 4.2 2.8 17.4A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3.1L13.7 4.2a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}

export function PlayIcon({ className, size = 13 }: IconProps) {
  return (
    <svg className={className} {...base(size)} fill="currentColor" stroke="none">
      <path d="M7 5.5v13l11-6.5z" />
    </svg>
  );
}

export function PauseIcon({ className, size = 13 }: IconProps) {
  return (
    <svg className={className} {...base(size)} fill="currentColor" stroke="none">
      <rect x="6.5" y="5.5" width="3.5" height="13" rx="1" />
      <rect x="14" y="5.5" width="3.5" height="13" rx="1" />
    </svg>
  );
}

export function InboxIcon({ className, size = 26 }: IconProps) {
  return (
    <svg className={className} {...base(size)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13l2.5-7.5A2 2 0 0 1 7.4 4h9.2a2 2 0 0 1 1.9 1.5L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
    </svg>
  );
}
