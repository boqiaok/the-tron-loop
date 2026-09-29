import { cn } from "@/lib/utils";

const NAVY = "#1F2A44";
const ACCENT = "#FF7A3D";
const TEAL = "#1BA39C";

/** The "whatson" wordmark: pin apostrophe, googly-eye "o" and a looping underline. */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="4 62 372 150"
      role="img"
      aria-label="whatson"
      className={cn(
        "block w-auto shrink-0 font-[family-name:var(--font-fredoka)]",
        compact ? "h-[34px]" : "h-[42px]",
      )}
    >
      <text x="10" y="150" textLength="186" lengthAdjust="spacingAndGlyphs" fontWeight="700" fontSize="84" fill={NAVY}>
        what
      </text>
      <g transform="translate(195.2 84) scale(0.1)">
        <path
          d="M120 22 C 172 22 202 58 202 100 C 202 146 152 180 120 218 C 88 180 38 146 38 100 C 38 58 68 22 120 22 Z"
          fill={ACCENT}
        />
        <circle cx="120" cy="96" r="30" fill="#ffffff" />
      </g>
      <text x="216" y="150" textLength="40" lengthAdjust="spacingAndGlyphs" fontWeight="700" fontSize="84" fill={NAVY}>
        s
      </text>
      <circle cx="290" cy="126" r="27" fill="#ffffff" stroke={ACCENT} strokeWidth="8" />
      <circle cx="299" cy="118" r="12" fill={NAVY} />
      <circle cx="302" cy="114" r="3.5" fill="#ffffff" />
      <path d="M268 84 Q 290 70 312 82" fill="none" stroke={NAVY} strokeWidth="6" strokeLinecap="round" />
      <text x="322" y="150" textLength="48" lengthAdjust="spacingAndGlyphs" fontWeight="700" fontSize="84" fill={ACCENT}>
        n
      </text>
      <path
        d="M14 196 C 110 196 160 196 196 190 C 226 184 232 162 214 162 C 196 162 198 190 232 198 C 266 206 320 202 366 190"
        fill="none"
        stroke={TEAL}
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The googly eye on its own, used where the full wordmark does not fit. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="250 64 80 100" aria-hidden="true" className={className}>
      <path d="M268 84 Q 290 70 312 82" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
      <circle cx="290" cy="126" r="28" fill="#ffffff" stroke={ACCENT} strokeWidth="8" />
      <circle cx="299" cy="118" r="13" fill={NAVY} />
    </svg>
  );
}
