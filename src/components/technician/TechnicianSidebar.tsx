import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
import { Button } from '@/components/ui/button';
import { TechnicianRating } from '@/components/ratings/TechnicianRating';
import {
  Home,
  LayoutDashboard,
  BarChart3,
  Wallet,
  CalendarDays,
  User,
  Map,
  Radio,
  LogOut,
} from 'lucide-react';
import logo from '@/assets/logo.png';

const menuItems = [
  { title: 'Tableau de bord', url: '/technician', icon: LayoutDashboard, end: true },
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="DépanPro" className="h-8 w-8" />
            {!collapsed && <span className="font-bold text-lg">DépanPro</span>}
          </Link>
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
