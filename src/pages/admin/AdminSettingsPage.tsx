import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Wrench, Users, Percent, Cog, Phone } from 'lucide-react';
import { ServicesSettingsTab } from '@/components/admin/settings/ServicesSettingsTab';
import { PriorityMultipliersTab } from '@/components/admin/settings/PriorityMultipliersTab';
import { UsersSettingsTab } from '@/components/admin/settings/UsersSettingsTab';
import { CommissionSettingsTab } from '@/components/admin/settings/CommissionSettingsTab';
import { DispatchAlgorithmTab } from '@/components/admin/settings/DispatchAlgorithmTab';
import { PhoneSettingsTab } from '@/components/admin/settings/PhoneSettingsTab';

export default function AdminSettingsPage() {
  return (
    <AdminLayout title="Administration" subtitle="Configuration système">
      <div className="space-y-6">
        <Tabs defaultValue="services" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="priorities" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Priorités
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="commission" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Commission
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Algorithme
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Téléphone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <ServicesSettingsTab />
          </TabsContent>

          <TabsContent value="priorities">
            <PriorityMultipliersTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersSettingsTab />
          </TabsContent>

          <TabsContent value="commission">
            <CommissionSettingsTab />
          </TabsContent>

          <TabsContent value="dispatch">
            <DispatchAlgorithmTab />
          </TabsContent>

          <TabsContent value="phone">
            <PhoneSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
