"use client";

import { useId } from "react";
import { motion } from "framer-motion";

/**
 * Segmented control whose green pill slides to the chosen option, so the
 * change of view reads as one control moving rather than two buttons swapping.
 */
export default function GlassSegmented({ label, options, value, onChange }) {
  const pillId = useId();
  return (
    <div role="group" aria-label={label} className="lg-segmented isolate">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {value === o.id && (
            <motion.span
              layoutId={pillId}
              aria-hidden="true"
              className="lg-segmented-pill"
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}
