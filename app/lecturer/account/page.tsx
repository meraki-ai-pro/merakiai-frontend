'use client';

/**
 * Lecturer account page.
 *
 * Deliberately thin: the profile and password controls are the same component
 * the student modal and the admin shell mount. Duplicating them per role is
 * how one surface ends up missing a field, or missing the current-password
 * requirement.
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AccountSettings } from '@/components/account/AccountSettings';

export default function LecturerAccountPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/lecturer"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Your courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Your account
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update your details or change your password.
        </p>
      </div>

      <AccountSettings />
    </div>
  );
}
