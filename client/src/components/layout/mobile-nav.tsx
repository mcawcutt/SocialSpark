import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Calendar, 
  Store, 
  BarChart2, 
  BarChart3,
  Settings, 
  HelpCircle,
  LogOut,
  Flame,
  Image,
  Building,
  Users,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ href, icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <Link href={href}>
      <a 
        className={cn(
          "flex items-center px-2 py-3 rounded-lg group transition-colors",
          active 
            ? "text-gray-900 bg-primary-50" 
            : "text-gray-600 hover:bg-gray-50"
        )}
        onClick={onClick}
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

export function MobileNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAdmin, isBrand, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <>
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-4 flex justify-between items-center md:hidden sticky top-0 z-10">
        <div>
          <img 
            src="/assets/IGNYT_Logo Black Web.png" 
            alt="Ignyt Logo" 
            className="h-9" 
          />
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMenu} className="text-gray-500 hover:text-gray-700 focus:outline-none">
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-800 bg-opacity-75 z-40 md:hidden transition-opacity",
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMenu}
      >
        <div 
          className="h-full w-64 bg-white pt-6 flex flex-col transition-transform duration-300"
          style={{ transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 flex justify-between items-center mb-6">
            <div>
              <img 
                src="/assets/IGNYT_Logo Black Web.png" 
                alt="Ignyt Logo" 
                className="h-9" 
              />
            </div>
            <Button variant="ghost" size="icon" onClick={closeMenu} className="text-gray-600">
              <X className="h-6 w-6" />
            </Button>
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
            {isAdmin ? (
              /* Admin-specific navigation */
              <>
                <NavItem 
                  href="/admin/dashboard" 
                  icon={LayoutDashboard} 
                  label="Overview" 
                  active={location === '/admin/dashboard'} 
                  onClick={closeMenu}
                />
                <NavItem 
                  href="/admin/brands" 
                  icon={Building} 
                  label="Brands" 
                  active={location === '/admin/brands'} 
                  onClick={closeMenu}
                />
                <NavItem 
                  href="/admin/analytics" 
                  icon={BarChart3} 
                  label="Analytics" 
                  active={location === '/admin/analytics'} 
                  onClick={closeMenu}
                />
                <NavItem 
                  href="/admin/users" 
                  icon={Users} 
                  label="Users" 
                  active={location === '/admin/users'} 
                  onClick={closeMenu}
                />
              </>
            ) : (
              /* Regular user navigation */
              <>
                <NavItem 
                  href="/" 
                  icon={LayoutDashboard} 
                  label="Dashboard" 
                  active={location === '/'} 
                  onClick={closeMenu}
                />
                <NavItem 
                  href="/content-calendar" 
                  icon={Calendar} 
                  label="Content Calendar" 
                  active={location === '/content-calendar'} 
                  onClick={closeMenu}
                />
                
                {/* Brand-specific items */}
                {isBrand && (
                  <>
                    <NavItem 
                      href="/retail-partners" 
                      icon={Store} 
                      label="Retail Partners" 
                      active={location === '/retail-partners'} 
                      onClick={closeMenu}
                    />
                    <NavItem 
                      href="/partner-invites" 
                      icon={UserPlus} 
                      label="Partner Invites" 
                      active={location === '/partner-invites'} 
                      onClick={closeMenu}
                    />
                    <NavItem 
                      href="/evergreen-content" 
                      icon={Flame} 
                      label="Evergreen Content" 
                      active={location === '/evergreen-content'} 
                      onClick={closeMenu}
                    />
                  </>
                )}
                
                <NavItem 
                  href="/media-library" 
                  icon={Image} 
                  label="Media Library" 
                  active={location === '/media-library'} 
                  onClick={closeMenu}
                />
                <NavItem 
                  href="/analytics" 
                  icon={BarChart3} 
                  label="Analytics" 
                  active={location === '/analytics'} 
                  onClick={closeMenu}
                />
              </>
            )}
            
            <NavItem 
              href="/settings" 
              icon={Settings} 
              label="Settings" 
              active={location === '/settings'} 
              onClick={closeMenu}
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
              onClick={() => {
                logoutMutation.mutate();
                closeMenu();
              }}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
