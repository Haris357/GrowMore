/**
 * GrowMore brand mark: ascending bars with a rising trend arrow.
 * Uses currentColor, so set the colour via a text-* class (brand green = text-primary).
 */
export function BrandLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {/* ascending bars */}
      <rect x="2" y="15" width="4" height="7" rx="1.2" fill="currentColor" opacity="0.35" />
      <rect x="10" y="11" width="4" height="11" rx="1.2" fill="currentColor" opacity="0.6" />
      <rect x="18" y="7" width="4" height="15" rx="1.2" fill="currentColor" opacity="0.9" />
      {/* rising trend line */}
      <polyline
        points="3 13 9 8.5 13 11.5 21 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* arrow head (up-right) */}
      <polyline
        points="16 4.5 21.5 4.5 21.5 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
