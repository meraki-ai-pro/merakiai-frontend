import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin/layout/AdminAuthGuard';
import { AdminShell } from '@/components/admin/layout/AdminShell';

export const metadata: Metadata = {
  title: 'Admin| Meraki',
  description: 'Meraki Admin Console',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGuard>
  );
}
