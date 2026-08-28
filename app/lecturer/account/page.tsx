'use client';

/**
 * Lecturer account page.
 *
 * Deliberately thin: the profile and password controls are the same component
 * the student modal and the admin shell mount. Duplicating them per role is
 * how one surface ends up missing a field, or missing the current-password
 * requirement.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { AccountSettings } from '@/components/account/AccountSettings';

export default function LecturerAccountPage() {
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    setForcePasswordChange(
      new URLSearchParams(window.location.search).get('forcePasswordChange') === '1'
    );
  }, []);

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

      {forcePasswordChange && (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
          <div>
            <p className="text-sm font-semibold">Password change required</p>
            <p className="mt-1 text-xs">
              This account was issued with a temporary password. Change it below before using
              the lecturer workspace. You will sign in again with the new password.
            </p>
          </div>
        </div>
      )}

      <AccountSettings forcePasswordChange={forcePasswordChange} />
    </div>
  );
}
