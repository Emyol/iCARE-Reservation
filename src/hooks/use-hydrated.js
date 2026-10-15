"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true after. Pages here are
 * prerendered at build time, so anything that depends on today's date must
 * wait for this, or the HTML from build day won't match and React throws #418.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
