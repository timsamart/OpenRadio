/**
 * One icon set, one stroke weight, inlined as SVG.
 *
 * The PRD wireframes use emoji (🔥 🎵 🎤 🪩) as category markers. Those are
 * placeholders: emoji render differently on every OS, are announced verbosely
 * by screen readers, and are the clearest "unfinished" signal a shipped UI can
 * carry. Every one of them is mapped to a glyph here instead.
 *
 * Icons are decorative — the accessible name always lives on the button.
 */

interface Props {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

export const Search = ({ size = 21, className }: Props) => (
  <svg {...base(size)} strokeWidth={2} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
);

export const Home = ({ size = 20 }: Props) => (
  <svg {...base(size)} strokeWidth={1.9}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

export const Compass = ({ size = 20 }: Props) => (
  <svg {...base(size)} strokeWidth={1.9}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
  </svg>
);

export const Star = ({ size = 20, filled = false }: Props & { filled?: boolean }) => (
  <svg {...base(size)} strokeWidth={1.9} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z" />
  </svg>
);

export const Heart = ({ size = 20, filled = false }: Props & { filled?: boolean }) =>
  filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M12 20.7 3.9 12.8a5.1 5.1 0 1 1 7.2-7.2l.9.9.9-.9a5.1 5.1 0 1 1 7.2 7.2z" />
    </svg>
  ) : (
    <svg {...base(size)} strokeWidth={1.9}>
      <path d="M12 20.7 3.9 12.8a5.1 5.1 0 1 1 7.2-7.2l.9.9.9-.9a5.1 5.1 0 1 1 7.2 7.2z" />
    </svg>
  );

export const Play = ({ size = 22 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M7 4.8v14.4a1 1 0 0 0 1.53.85l11.2-7.2a1 1 0 0 0 0-1.7L8.53 3.95A1 1 0 0 0 7 4.8" />
  </svg>
);

export const Pause = ({ size = 22 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <rect x="6" y="4.5" width="4.4" height="15" rx="1.2" />
    <rect x="13.6" y="4.5" width="4.4" height="15" rx="1.2" />
  </svg>
);

export const PrevStation = ({ size = 24 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <rect x="5" y="5" width="2.4" height="14" rx="1" />
    <path d="M19.5 5.9v12.2a1 1 0 0 1-1.55.83l-9.1-6.1a1 1 0 0 1 0-1.66l9.1-6.1a1 1 0 0 1 1.55.83" />
  </svg>
);

export const NextStation = ({ size = 24 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <rect x="16.6" y="5" width="2.4" height="14" rx="1" />
    <path d="M4.5 5.9v12.2a1 1 0 0 0 1.55.83l9.1-6.1a1 1 0 0 0 0-1.66l-9.1-6.1A1 1 0 0 0 4.5 5.9" />
  </svg>
);

export const ChevronDown = ({ size = 21 }: Props) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="m5 9 7 7 7-7" />
  </svg>
);

export const ChevronLeft = ({ size = 21 }: Props) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const Close = ({ size = 20 }: Props) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const Share = ({ size = 20 }: Props) => (
  <svg {...base(size)} strokeWidth={1.9}>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
  </svg>
);

export const Timer = ({ size = 22 }: Props) => (
  <svg {...base(size)} strokeWidth={1.9}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.5 2M9.5 2h5" />
  </svg>
);

export const ArrowUp = ({ size = 18 }: Props) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const ArrowDown = ({ size = 18 }: Props) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);

export const WifiOff = ({ size = 17 }: Props) => (
  <svg {...base(size)} strokeWidth={1.9}>
    <path d="M3 3l18 18M5.5 12.5A12 12 0 0 1 9 10.2M2 8.8A18 18 0 0 1 7.6 5.4m8.8 0A18 18 0 0 1 22 8.8M15 9.8a12 12 0 0 1 3.5 2.3M8.8 15.6a7 7 0 0 1 6.4 0M12 20h.01" />
  </svg>
);

/* ------------------------------------------------ curated category glyphs */

export const Flame = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 3s5.2 4.1 5.2 8.4a5.2 5.2 0 0 1-10.4 0c0-1.6.7-2.8 1.6-3.7.5 1.1 1.5 1.6 2 2.6.5-3.1 1.6-5.6 1.6-7.3" />
  </svg>
);

export const MusicNote = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <circle cx="7" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
    <path d="M10 18V5l10-2v13" />
  </svg>
);

export const Mic = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M6 11a6 6 0 0 0 12 0M12 17v5" />
  </svg>
);

export const Notes = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <circle cx="6" cy="18" r="2.6" />
    <circle cx="18" cy="16" r="2.6" />
    <path d="M8.6 18V6l11.4-3v13M8.6 10 20 7" />
  </svg>
);

export const Disc = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.4" />
  </svg>
);

export const Globe = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18" />
  </svg>
);

export const Newspaper = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 5h13v14H5a1 1 0 0 1-1-1z" />
    <path d="M17 9h3v9a1 1 0 0 1-1 1h-2M7 8.5h7M7 12h7M7 15.5h4" />
  </svg>
);

export const Trophy = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 5H4v1.8A3.2 3.2 0 0 0 7.2 10M17 5h3v1.8A3.2 3.2 0 0 1 16.8 10M9.5 19.5h5M12 14v5.5" />
  </svg>
);

export const MapPin = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);
