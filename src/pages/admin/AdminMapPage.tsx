import { AdminLayout } from '@/components/admin/AdminLayout';
import { TechniciansMapContent } from '@/components/map/TechniciansMapContent';

export default function AdminMapPage() {
  return (
    <AdminLayout title="Carte Techniciens" subtitle="Localisation en temps réel">
      <div className="h-[calc(100vh-10rem)]">
        <TechniciansMapContent />
      </div>
    </AdminLayout>
  );
}
