import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

export const Star = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 1l2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6L12 1z" />
  </svg>
);

export const Sparkle = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2c.6 4.6 1.4 5.4 6 6-4.6.6-5.4 1.4-6 6-.6-4.6-1.4-5.4-6-6 4.6-.6 5.4-1.4 6-6z" />
  </svg>
);

export const Squiggle = (p: P) => (
  <svg viewBox="0 0 60 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}>
    <path d="M2 6c4-6 8 6 12 0s8 6 12 0 8 6 12 0 8 6 12 0 8 6 8 6" />
  </svg>
);

export const Blob = (p: P) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...p}>
    <path d="M50 5c20 0 38 12 42 30s-8 38-26 48-44 6-54-12-2-44 12-56 16-10 26-10z" />
  </svg>
);

export const Burst = (p: P) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...p}>
    <path d="M50 0l8 22 22-12-8 24 24 4-22 10 18 18-24-4-2 24-14-20-14 20-2-24-24 4 18-18-22-10 24-4-8-24 22 12z" />
  </svg>
);

export const Heart = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 21s-7.5-4.5-9.5-10C1 6.5 4 3 7.5 3c2 0 3.5 1 4.5 2.5C13 4 14.5 3 16.5 3 20 3 23 6.5 21.5 11c-2 5.5-9.5 10-9.5 10z" />
  </svg>
);

export const Skull = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2C7 2 4 5.5 4 10c0 2.5 1 4.5 2.5 6V20c0 1 .8 2 2 2h.5v-3h2v3h2v-3h2v3h.5c1.2 0 2-1 2-2v-4c1.5-1.5 2.5-3.5 2.5-6 0-4.5-3-8-8-8zm-3 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
  </svg>
);

export const Lightning = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
  </svg>
);

export const Eye = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

export const Ribbon = (p: P) => (
  <svg viewBox="0 0 80 24" fill="currentColor" {...p}>
    <path d="M0 4l8 8-8 8h72l8-8-8-8H0z" />
  </svg>
);

/** Octopus mascot mark — flat, stylized, no emoji. */
export const OctopusMark = ({ className = "", ...p }: P) => (
  <svg viewBox="0 0 100 100" fill="none" {...p} className={className}>
    <ellipse cx="50" cy="40" rx="28" ry="26" fill="currentColor" />
    <path d="M22 50c-4 12-10 18-14 22 6 0 14-4 18-12M30 60c-2 14-8 22-12 28 8-2 16-10 18-22M50 66c0 16-2 26-2 32 6-6 8-18 8-30M70 60c2 14 8 22 12 28-8-2-16-10-18-22M78 50c4 12 10 18 14 22-6 0-14-4-18-12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
    <circle cx="40" cy="38" r="5" fill="#fff" />
    <circle cx="60" cy="38" r="5" fill="#fff" />
    <circle cx="40" cy="38" r="2.5" fill="#000" />
    <circle cx="60" cy="38" r="2.5" fill="#000" />
    <path d="M44 50c2 2 8 2 12 0" stroke="#000" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);
