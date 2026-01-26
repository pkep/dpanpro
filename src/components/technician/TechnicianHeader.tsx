import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';

interface TechnicianHeaderProps {
  title?: string;
  subtitle?: string;
}

export function TechnicianHeader({ title, subtitle }: TechnicianHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          {title && (
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationsDropdown />
        </div>
      </div>
    </header>
  );
}
