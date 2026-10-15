// Shared motion presets for Liquid Glass pages (see the "Motion" section of liquid-glass.css).

export const EASE_OUT = [0.23, 1, 0.32, 1];

// Content slides the way time moved (later = from the right, earlier = from the
// left) and crossfades when direction is 0. Use with <AnimatePresence custom={dir}>.
export const slideByDirection = {
  enter: (dir) => ({ opacity: 0, transform: `translateX(${dir * 24}px)` }),
  center: { opacity: 1, transform: "translateX(0px)", transition: { duration: 0.22, ease: EASE_OUT } },
  exit: (dir) => ({ opacity: 0, transform: `translateX(${dir * -24}px)`, transition: { duration: 0.1, ease: EASE_OUT } }),
};

// A list dealt in top first, 40 ms apart (capped so long lists don't drag).
export const dealIn = (i) => ({
  initial: { opacity: 0, transform: "translateY(8px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  transition: { duration: 0.22, ease: EASE_OUT, delay: Math.min(i, 8) * 0.04 },
});
