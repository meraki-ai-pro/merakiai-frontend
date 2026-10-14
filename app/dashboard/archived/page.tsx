import { ArchivedSessions } from '@/components/sidebar/ArchivedSessions';

export const metadata = {
  title: 'Archived sessions | Meraki',
  description: 'Sessions you archived from the sidebar.',
};

/** Under /dashboard so it keeps the sidebar and header (DashboardShell). */
export default function ArchivedPage() {
  return <ArchivedSessions />;
}
