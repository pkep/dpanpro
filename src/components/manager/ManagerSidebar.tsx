import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Map,
  Calendar,
  Home,
  LogOut,
} from 'lucide-react';
import logo from '@/assets/logo.png';

const menuItems = [
  { title: 'Tableau de bord', url: '/manager', icon: LayoutDashboard, end: true },
  { title: 'Gestion Techniciens', url: '/manager/technicians', icon: Users },
  { title: 'Dashboard Performance', url: '/manager/performance', icon: BarChart3 },
  { title: 'Carte Techniciens', url: '/manager/map', icon: Map },
  { title: 'Planning', url: '/manager/planning', icon: Calendar },
];

export function ManagerSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();

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
            <img src={logo} alt="DépanPro" className="h-8 w-8 shrink-0" />
            {!collapsed && <span className="font-bold text-lg">DépanPro</span>}
          </Link>
          <SidebarTrigger className={collapsed ? "hidden" : ""} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Info */}
        <SidebarGroup>
          <div className="flex items-center gap-3 px-3 py-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                <span className="text-xs text-blue-600 font-medium">Manager</span>
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
                      activeClassName="bg-blue-600/10 text-blue-600"
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
