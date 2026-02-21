import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { TechniciansMapContent } from '@/components/map/TechniciansMapContent';

export default function ManagerMapPage() {
  return (
    <ManagerLayout title="Carte Techniciens" subtitle="Localisation en temps réel">
      <div className="h-[calc(100vh-10rem)]">
        <TechniciansMapContent />
      </div>
    </ManagerLayout>
  );
}
