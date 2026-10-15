"use client";

import Image from "next/image";
import { LogIn } from "lucide-react";

/** Shown in place of a staff page's content until someone signs in. */
export default function StaffOnly({ what, onSignIn }) {
  return (
    <section className="lg-pass flex flex-wrap items-center gap-6 p-6" aria-labelledby="staff-only-title">
      <Image src="/brand/glass-pass-stack-login.webp" alt="" width={120} height={120} className="rounded-2xl" />
      <div className="flex min-w-0 max-w-prose flex-col items-start gap-3">
        <div>
          <h2 id="staff-only-title" className="lg-title">
            For iCARE staff
          </h2>
          <p className="mt-1 lg-muted">Sign in with your staff account to see {what}.</p>
        </div>
        <button type="button" onClick={onSignIn} className="lg-btn lg-btn-primary">
          <LogIn aria-hidden="true" className="size-4" strokeWidth={2} />
          Staff sign in
        </button>
      </div>
    </section>
  );
}
