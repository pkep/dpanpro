import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Users, UserPlus, Shield, Search, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const initialFormState: CreateUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
};

export function UsersSettingsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [managerForm, setManagerForm] = useState<CreateUserForm>(initialFormState);
  const [adminForm, setAdminForm] = useState<CreateUserForm>(initialFormState);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch managers with their permissions
  const { data: managersData, isLoading: loadingManagers } = useQuery({
    queryKey: ['managers-with-permissions', searchQuery],
    queryFn: async () => {
      // Get all users with manager role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'manager');

      if (rolesError) throw rolesError;

      const managerIds = userRoles?.map((r) => r.user_id) || [];
      if (managerIds.length === 0) return [];

      // Get user details
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .in('id', managerIds);

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data: users, error: usersError } = await query.order('last_name');

      if (usersError) throw usersError;

      // Get permissions
      const { data: permissions, error: permError } = await supabase
        .from('manager_permissions')
        .select('user_id, can_create_managers')
        .in('user_id', managerIds);

      if (permError) throw permError;

      const permMap = new Map(permissions?.map((p) => [p.user_id, p.can_create_managers]) || []);

      return (users || []).map((u) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone,
        canCreateManagers: permMap.get(u.id) || false,
      }));
    },
  });

  const managers = managersData || [];
  const totalPages = Math.ceil(managers.length / itemsPerPage);
  const paginatedManagers = managers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const createUserMutation = useMutation({
    mutationFn: async ({ form, role }: { form: CreateUserForm; role: 'manager' | 'admin' }) => {
      // Hash a temporary password
      const tempPassword = crypto.randomUUID().slice(0, 12);
      const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password: tempPassword },
      });

      if (hashError) throw hashError;

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone || null,
          password_hash: hashData.hash,
          role: role,
        })
        .select('id')
        .single();

      if (userError) throw userError;

      // Add role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: newUser.id,
        role: role,
        created_by: user?.id,
      });

      if (roleError) throw roleError;

      return { userId: newUser.id, tempPassword };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['managers-with-permissions'] });
      toast.success(
        `${variables.role === 'admin' ? 'Administrateur' : 'Manager'} créé avec succès. Mot de passe temporaire: ${data.tempPassword}`
      );
      if (variables.role === 'manager') {
        setManagerDialogOpen(false);
        setManagerForm(initialFormState);
      } else {
        setAdminDialogOpen(false);
        setAdminForm(initialFormState);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, canCreateManagers }: { userId: string; canCreateManagers: boolean }) => {
      const { error } = await supabase.from('manager_permissions').upsert(
        {
          user_id: userId,
          can_create_managers: canCreateManagers,
          granted_by: user?.id,
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers-with-permissions'] });
      toast.success('Permissions mises à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour des permissions');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestion des utilisateurs
        </CardTitle>
        <CardDescription>Créer des managers et administrateurs, gérer les droits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Users Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Create Manager Dialog */}
          <Dialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Créer un Manager
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Cliquez pour ajouter un nouveau manager</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un Manager</DialogTitle>
                <DialogDescription>Remplissez les informations du nouveau manager</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="manager-firstName">Prénom *</Label>
                    <Input
                      id="manager-firstName"
                      value={managerForm.firstName}
                      onChange={(e) => setManagerForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="manager-lastName">Nom *</Label>
                    <Input
                      id="manager-lastName"
                      value={managerForm.lastName}
                      onChange={(e) => setManagerForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="manager-email">Email *</Label>
                  <Input
                    id="manager-email"
                    type="email"
                    value={managerForm.email}
                    onChange={(e) => setManagerForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="manager-phone">Téléphone (optionnel)</Label>
                  <Input
                    id="manager-phone"
                    type="tel"
                    value={managerForm.phone}
                    onChange={(e) => setManagerForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setManagerDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => createUserMutation.mutate({ form: managerForm, role: 'manager' })}
                  disabled={
                    !managerForm.firstName || !managerForm.lastName || !managerForm.email || createUserMutation.isPending
                  }
                >
                  {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Admin Dialog */}
          <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Créer un Administrateur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Cliquez pour ajouter un nouvel administrateur</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un Administrateur</DialogTitle>
                <DialogDescription>Remplissez les informations du nouvel administrateur</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-firstName">Prénom *</Label>
                    <Input
                      id="admin-firstName"
                      value={adminForm.firstName}
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-lastName">Nom *</Label>
                    <Input
                      id="admin-lastName"
                      value={adminForm.lastName}
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="admin-email">Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="admin-phone">Téléphone (optionnel)</Label>
                  <Input
                    id="admin-phone"
                    type="tel"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdminDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => createUserMutation.mutate({ form: adminForm, role: 'admin' })}
                  disabled={
                    !adminForm.firstName || !adminForm.lastName || !adminForm.email || createUserMutation.isPending
                  }
                >
                  {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Manager Permissions Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Droits des managers
            </CardTitle>
            <CardDescription>Gérer les permissions de création de managers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, prénom, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* Managers List */}
            {loadingManagers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paginatedManagers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun manager trouvé</p>
            ) : (
              <div className="space-y-2">
                {paginatedManagers.map((manager) => (
                  <div
                    key={manager.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {manager.firstName} {manager.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{manager.email}</p>
                      {manager.phone && <p className="text-sm text-muted-foreground">{manager.phone}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Peut créer des managers</span>
                      <Switch
                        checked={manager.canCreateManagers}
                        onCheckedChange={(checked) =>
                          updatePermissionMutation.mutate({ userId: manager.id, canCreateManagers: checked })
                        }
                        disabled={updatePermissionMutation.isPending}
                      />
                      {manager.canCreateManagers ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
