import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Calendar, 
  Store, 
  BarChart2, 
  Settings, 
  HelpCircle,
  LogOut,
  Flame,
  Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link href={href}>
      <a 
        className={cn(
          "flex items-center px-2 py-3 rounded-lg group transition-colors",
          active 
            ? "text-gray-900 bg-primary-50" 
            : "text-gray-600 hover:bg-gray-50"
        )}
      >
        <Icon 
          className={cn(
            "mr-3 h-5 w-5", 
            active ? "text-primary-500" : "text-gray-500"
          )} 
        />
        <span>{label}</span>
      </a>
    </Link>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="p-6">
        <div>
          <img 
            src="/assets/IGNYT_Logo Black Web.png" 
            alt="Ignyt Logo" 
            className="h-10" 
          />
        </div>
      </div>
      
      {/* User Info */}
      <div className="px-6 mb-6 flex items-center">
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
          {initials}
        </div>
        <div className="ml-3">
          <p className="font-semibold text-gray-800">{user.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user.planType} Plan</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1">
        <NavItem 
          href="/" 
          icon={LayoutDashboard} 
          label="Dashboard" 
          active={location === '/'} 
        />
        <NavItem 
          href="/calendar" 
          icon={Calendar} 
          label="Content Calendar" 
          active={location === '/calendar'} 
        />
        <NavItem 
          href="/evergreen" 
          icon={Flame} 
          label="Evergreen Content" 
          active={location === '/evergreen'} 
        />
        <NavItem 
          href="/partners" 
          icon={Store} 
          label="Retail Partners" 
          active={location === '/partners'} 
        />
        <NavItem 
          href="/media" 
          icon={Image} 
          label="Media Library" 
          active={location === '/media'} 
        />
        <NavItem 
          href="/analytics" 
          icon={BarChart2} 
          label="Analytics" 
          active={location === '/analytics'} 
        />
        <NavItem 
          href="/settings" 
          icon={Settings} 
          label="Settings" 
          active={location === '/settings'} 
        />
      </nav>

      {/* Help & Logout */}
      <div className="px-6 py-4 border-t border-gray-200 space-y-4">
        <a href="#" className="flex items-center text-gray-600 hover:text-primary-500">
          <HelpCircle className="h-4 w-4 mr-2" />
          <span>Help & Support</span>
        </a>
        <Button 
          variant="ghost" 
          className="flex w-full items-center justify-start p-0 text-gray-600 hover:text-red-500 hover:bg-transparent"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}
