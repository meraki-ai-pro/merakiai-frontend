'use client';

/**
 * Voice library — lecturer level, not course level.
 *
 * Which course uses which voice is set on that course's Settings tab. Voices
 * live here because one lecturer teaching four courses records once.
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { VoiceStudio } from '@/components/lecturer/VoiceStudio';

export default function LecturerVoicePage() {
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
          Your voice
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Record once and choose which of your courses it speaks for. Students on those
          courses hear you narrating concept videos and the lesson board.
        </p>
      </div>

      <VoiceStudio />
    </div>
  );
}
