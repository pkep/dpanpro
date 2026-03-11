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
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="services" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
              <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="priorities" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Priorités
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="commission" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
              <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Commission</span>
              <span className="sm:hidden">Com.</span>
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
              <Cog className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Algorithme</span>
              <span className="sm:hidden">Algo</span>
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Téléphone</span>
              <span className="sm:hidden">Tél.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services"><ServicesSettingsTab /></TabsContent>
          <TabsContent value="priorities"><PriorityMultipliersTab /></TabsContent>
          <TabsContent value="users"><UsersSettingsTab /></TabsContent>
          <TabsContent value="commission"><CommissionSettingsTab /></TabsContent>
          <TabsContent value="dispatch"><DispatchAlgorithmTab /></TabsContent>
          <TabsContent value="phone"><PhoneSettingsTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
