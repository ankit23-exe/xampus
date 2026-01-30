import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      icon: MessageSquare,
      label: 'Campus Queries',
      subtitle: 'Primary • Chatbot Knowledge Base',
      isPrimary: true,
    },
    {
      path: '/complaints',
      icon: AlertTriangle,
      label: 'Campus Complaints',
      subtitle: 'Secondary • Issue Management',
      isPrimary: false,
    },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/10">
          <LayoutGrid className="h-5 w-5 text-sidebar-primary" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">ResolveHub</span>
            <span className="text-[10px] text-sidebar-muted">Admin Panel</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        {!collapsed && (
          <span className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">
            Modules
          </span>
        )}
        
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                  isActive 
                    ? 'nav-active' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  collapsed && 'justify-center px-0'
                )}
              >
                <item.icon 
                  className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                  )} 
                />
                
                {!collapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      'text-sm font-medium truncate',
                      isActive && 'text-sidebar-foreground'
                    )}>
                      {item.label}
                    </span>
                    <span className={cn(
                      'text-[10px] truncate',
                      isActive ? 'text-sidebar-muted' : 'text-sidebar-muted/70'
                    )}>
                      {item.subtitle}
                    </span>
                  </div>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 hidden rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
