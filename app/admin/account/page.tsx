'use client';

/**
 * Admin account page — the same profile and password component the student
 * modal and the lecturer workspace mount. See components/account.
 */

import { AccountSettings } from '@/components/account/AccountSettings';

export default function AdminAccountPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-950 dark:text-white">Your account</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update your details or change your password.
        </p>
      </div>
      <AccountSettings />
    </div>
  );
}
