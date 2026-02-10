import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TechnicianRating } from '@/components/ratings/TechnicianRating';
import {
  Home,
  ClipboardList,
  LayoutDashboard,
  BarChart3,
  Wallet,
  CalendarDays,
  User,
  Map,
  Radio,
  LogOut,
  Play,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';

const menuItems = [
  { title: 'Tableau de bord', url: '/technician', icon: LayoutDashboard, end: true },
  { title: 'Interventions', url: '/technician/interventions', icon: ClipboardList },
  { title: 'Statistiques', url: '/technician/stats', icon: BarChart3 },
  { title: 'Revenus', url: '/technician/revenue', icon: Wallet },
  { title: 'Planning', url: '/technician/schedule', icon: CalendarDays },
  { title: 'Profil', url: '/technician/profile', icon: User },
];

const toolsItems = [
  { title: 'Carte', url: '/map', icon: Map },
  { title: 'Suivi GPS', url: '/live-tracking', icon: Radio },
];

export function TechnicianSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch active intervention for the technician
  const { data: activeIntervention } = useQuery({
    queryKey: ['active-intervention', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('interventions')
        .select('id, title, category')
        .eq('technician_id', user.id)
        .in('status', ['assigned', 'on_route', 'arrived', 'in_progress'])
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Dépan.Pro" className="h-8 w-8 shrink-0" />
            {!collapsed && <span className="font-bold text-lg">Dépan.Pro</span>}
          </Link>
          <SidebarTrigger className={collapsed ? "hidden" : ""} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Info */}
        <SidebarGroup>
          <div className="flex items-center gap-3 px-3 py-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Technicien</span>
                  <TechnicianRating technicianId={user.id} size="sm" showCount={false} />
                </div>
              </div>
            )}
          </div>
        </SidebarGroup>

        {/* Active Intervention Link */}
        {activeIntervention && (
          <SidebarGroup>
            <SidebarGroupLabel>Mission en cours</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.includes(`/technician/intervention/${activeIntervention.id}`)}
                    tooltip={collapsed ? 'Reprendre l\'intervention' : undefined}
                  >
                    <Link
                      to={`/technician/intervention/${activeIntervention.id}`}
                      className="flex items-center gap-3 text-primary"
                    >
                      <Play className="h-4 w-4" />
                      {!collapsed && <span>Reprendre l'intervention</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.end 
                      ? location.pathname === item.url 
                      : location.pathname.startsWith(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="flex items-center gap-3"
                      activeClassName="bg-primary/10 text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Outils</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3"
                      activeClassName="bg-primary/10 text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {collapsed && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Agrandir le menu">
                <SidebarTrigger className="w-full justify-center" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={collapsed ? 'Accueil' : undefined}>
              <Link to="/" className="flex items-center gap-3">
                <Home className="h-4 w-4" />
                {!collapsed && <span>Accueil</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={collapsed ? 'Déconnexion' : undefined}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
