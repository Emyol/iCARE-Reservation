"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

/**
 * Floating glass sheet (dialog). Docks to the right edge on desktop, as in
 * the public comp, and becomes a bottom sheet on phones. No scrim: the
 * schedule stays visible behind it so the chosen slot keeps its context.
 * It slides in from the edge it docks to and leaves the same way; render it
 * inside <AnimatePresence> so the exit can play.
 */
export default function GlassSheet({ titleId, title, subtitle, onClose, children, footer }) {
  const dialogRef = useAccessibleDialog(onClose);
  const reduceMotion = useReducedMotion();
  // Read once on mount so the first frame already starts from the right edge.
  const [edgeOffset] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? "translateX(32px)" : "translateY(48px)",
  );
  // Reduced motion: fade in place (Motion would otherwise snap the offset).
  const offscreen = reduceMotion ? "translate(0px, 0px)" : edgeOffset;
  return (
    <motion.div
      initial={{ opacity: 0, transform: offscreen }}
      animate={{ opacity: 1, transform: "translate(0px, 0px)" }}
      exit={{ opacity: 0, transform: offscreen, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-x-3 bottom-3 z-50 md:inset-x-auto md:bottom-auto md:right-6 md:top-28 md:w-[400px]"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="lg-sheet flex max-h-[80vh] flex-col overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div>
            <h2 id={titleId} className="lg-title">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-[15px] lg-muted lg-num">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="lg-btn lg-btn-secondary lg-btn-icon -mr-2 -mt-1">
            <X aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto px-6 py-3 text-[15px]">{children}</div>
        {footer && <div className="flex flex-col gap-2 px-6 pb-6 pt-3">{footer}</div>}
      </div>
    </motion.div>
  );
}
