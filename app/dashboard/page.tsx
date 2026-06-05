import { AuthGuard } from '@/components/dashboard/AuthGuard';

export const metadata = {
  title: 'Dashboard | Meraki',
  description: 'Your AI-powered learning dashboard.',
};

export default function DashboardPage() {
  return <AuthGuard />;
}
