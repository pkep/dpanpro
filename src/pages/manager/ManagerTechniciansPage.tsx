import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CheckCircle, Clock, Wallet, AlertTriangle } from 'lucide-react';
import { PendingTechniciansTab } from '@/components/admin/technicians/PendingTechniciansTab';
import { ActiveTechniciansTab } from '@/components/admin/technicians/ActiveTechniciansTab';
import { DispatchTab } from '@/components/admin/technicians/DispatchTab';
import { PayoutsTab } from '@/components/admin/technicians/PayoutsTab';
import { DisputesTab } from '@/components/admin/technicians/DisputesTab';

export default function ManagerTechniciansPage() {
  return (
    <ManagerLayout title="Gestion des Techniciens" subtitle="Validation, dispatch et suivi">
      <div className="space-y-6">
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En attente
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Actifs
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Dispatch
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Versements
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Litiges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingTechniciansTab />
          </TabsContent>

          <TabsContent value="active">
            <ActiveTechniciansTab />
          </TabsContent>

          <TabsContent value="dispatch">
            <DispatchTab />
          </TabsContent>

          <TabsContent value="payments">
            <PayoutsTab />
          </TabsContent>

          <TabsContent value="disputes">
            <DisputesTab />
          </TabsContent>
        </Tabs>
      </div>
    </ManagerLayout>
  );
}
