import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  Calculator,
  AlertTriangle,
  FileCheck,
  MessageSquare,
  AlertCircle,
  Lock,
  History,
  Settings,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Briefcase,
  Shield,
  FileText,
  FileSignature,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagement } from '@/contexts/EngagementContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Items that are always accessible
const alwaysActiveItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Engagements', href: '/engagements', icon: Briefcase },
  { name: 'Compliance Applicability', href: '/compliance-applicability', icon: Shield },
];

// Items that require an engagement to be selected
const engagementDependentItems = [
  { name: 'Trial Balance', href: '/trial-balance', icon: FileSpreadsheet },
  { name: 'Trial Balance New', href: '/trial-balance-new', icon: FileSpreadsheet },
  { name: 'Appointment', href: '/appointment', icon: FileSignature },
  { name: 'Materiality', href: '/materiality', icon: Calculator },
  { name: 'Risk Register', href: '/risks', icon: AlertTriangle },
  { name: 'Audit Execution', href: '/audit-execution', icon: ClipboardList },
  { name: 'Evidence Vault', href: '/evidence', icon: FileCheck },
  { name: 'Review Notes', href: '/review-notes', icon: MessageSquare },
  { name: 'Misstatements', href: '/misstatements', icon: AlertCircle },
  { name: 'Audit Report', href: '/audit-report', icon: FileText },
  { name: 'VERA Tools', href: '/audit-tools', icon: Wrench },
  { name: 'Feedback', href: '/feedback', icon: MessageSquare },
];

const secondaryNavItems = [
  { name: 'Audit Trail', href: '/audit-trail', icon: History, requiresEngagement: true },
  { name: 'Completion', href: '/completion', icon: Lock, requiresEngagement: true },
  { name: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
  { name: 'Admin Settings', href: '/admin/settings', icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { currentEngagement } = useEngagement();
  const isAdmin = role === 'partner' || role === 'manager';
  const hasEngagement = !!currentEngagement;

  const handleLogoClick = () => {
    navigate('/');
  };

  const renderName = (name: string) => {
    if (!name) return name;
    return (
      <>
        <span className="underline underline-offset-2">{name[0]}</span>
        <span>{name.slice(1)}</span>
      </>
    );
  };

  const NavItem = ({ item, disabled = false }: { item: { name: string; href: string; icon: any }; disabled?: boolean }) => {
    const isActive = location.pathname === item.href;
    
    if (disabled) {
      const content = (
        <div
          className={cn(
            'nav-link group relative cursor-not-allowed opacity-50',
          )}
        >
          <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          {!collapsed && (
            <span className="truncate text-muted-foreground">
              {renderName(item.name)}
            </span>
          )}
        </div>
      );

      if (collapsed) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{content}</TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.name} - Select an engagement first</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return content;
    }
    
    return (
      <NavLink
        to={item.href}
        className={cn(
          'nav-link group relative',
          isActive && 'active'
        )}
      >
        <item.icon className={cn(
          'h-5 w-5 shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        )} />
        {!collapsed && (
          <span className={cn(
            'truncate transition-colors',
            isActive ? 'text-primary font-medium' : ''
          )}>
            {renderName(item.name)}
          </span>
        )}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-primary rounded-r" />
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border h-16 px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="font-semibold text-foreground text-sm">AuditPro</h1>
              <p className="text-xs text-muted-foreground">Audit Management</p>
            </div>
          </button>
        )}
        {collapsed && (
          <button
            onClick={handleLogoClick}
            className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Audit Workflow
            </p>
          )}
          {/* Always active items */}
          {alwaysActiveItems.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
          {/* Engagement-dependent items */}
          {engagementDependentItems.map((item) => (
            <NavItem key={item.name} item={item} disabled={!hasEngagement} />
          ))}
        </div>

        <div className="pt-4 space-y-1">
          {!collapsed && (
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Administration
            </p>
          )}
          {secondaryNavItems
            .filter(item => {
              if (item.adminOnly) return isAdmin;
              if (item.staffOnly) return !isAdmin;
              return true;
            })
            .map((item) => (
              <NavItem 
                key={item.name} 
                item={item} 
                disabled={item.requiresEngagement && !hasEngagement} 
              />
          ))}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent',
            !collapsed && 'justify-start'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
