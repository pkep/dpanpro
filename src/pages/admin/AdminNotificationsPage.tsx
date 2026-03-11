import { AdminLayout } from '@/components/admin/AdminLayout';
import { NotificationSettingsManager } from '@/components/admin/notifications/NotificationSettingsManager';

export default function AdminNotificationsPage() {
  return (
    <AdminLayout title="Administration" subtitle="Gestion des notifications">
      <NotificationSettingsManager />
    </AdminLayout>
  );
}
