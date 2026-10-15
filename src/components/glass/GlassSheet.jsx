"use client";

import { X } from "lucide-react";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

/**
 * Floating glass sheet (dialog). Docks to the right edge on desktop, as in
 * the public comp, and becomes a bottom sheet on phones. No scrim: the
 * schedule stays visible behind it so the chosen slot keeps its context.
 */
export default function GlassSheet({ titleId, title, subtitle, onClose, children, footer }) {
  const dialogRef = useAccessibleDialog(onClose);
  return (
    <div className="lg-materialize fixed inset-x-3 bottom-3 z-50 md:inset-x-auto md:bottom-auto md:right-6 md:top-28 md:w-[400px]">
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
    </div>
  );
}
