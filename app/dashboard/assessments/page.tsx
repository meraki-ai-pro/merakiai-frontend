import { AssessmentRunner } from '@/components/assessment/AssessmentRunner';

export const metadata = {
  title: 'Exams | Meraki',
  description: 'Tests and exams set by your lecturer.',
};

/**
 * Sits under /dashboard so it inherits DashboardShell — the course picker in
 * the header is what selects which course's exams are listed.
 */
export default function AssessmentsPage() {
  return <AssessmentRunner />;
}
