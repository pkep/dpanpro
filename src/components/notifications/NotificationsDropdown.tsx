import { useNavigate } from 'react-router-dom';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useRealtimeNotifications();

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    // Use action URL if available, otherwise default to intervention page
    const url = notification.actionUrl || `/intervention/${notification.interventionId}`;
    navigate(url);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return '🔔';
      case 'status_change':
        return '🔄';
      case 'new_intervention':
        return '🚨';
      case 'quote_modification':
        return '📋';
      case 'new_message':
        return '💬';
      case 'new_photo':
        return '📷';
      case 'client_cancellation':
        return '❌';
      default:
        return '📢';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Tout lire
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  clearNotifications();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                  !notification.read ? 'bg-muted/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex items-center gap-2">
                    <span>{getNotificationIcon(notification.type)}</span>
                    <span className="font-medium text-sm">{notification.title}</span>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                  {notification.message}
                </p>
                <div className="flex items-center justify-between w-full pl-6">
                  <time className="text-xs text-muted-foreground">
                    {format(new Date(notification.createdAt), 'dd MMM HH:mm', { locale: fr })}
                  </time>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
