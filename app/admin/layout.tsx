import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin/layout/AdminAuthGuard';
import { AdminShell } from '@/components/admin/layout/AdminShell';

export const metadata: Metadata = {
  title: { absolute: 'Meraki AI Admin Console' },
  description: 'Meraki Admin Console',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGuard>
  );
}
