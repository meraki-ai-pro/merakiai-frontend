import { AssessmentRunner } from '@/components/assessment/AssessmentRunner';

export const metadata = {
  title: 'Assessments | Meraki',
  description: 'Pre and post assessments for your course.',
};

/**
 * Sits under /dashboard so it inherits DashboardShell — the course picker in
 * the header is what selects which course's assessments are listed.
 */
export default function AssessmentsPage() {
  return <AssessmentRunner />;
}
