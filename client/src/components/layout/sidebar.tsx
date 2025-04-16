import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Store,
  Image,
  Flame,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Building,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

function SidebarItem({ icon, label, href, active }: SidebarItemProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          active 
            ? "bg-accent text-accent-foreground font-medium" 
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="w-5 h-5 shrink-0">{icon}</div>
        <span>{label}</span>
      </a>
    </Link>
  );
}

export function Sidebar() {
  const { user, isAdmin, isBrand, isPartner, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [currentBrandId, setCurrentBrandId] = useState<number | null>(null);
  const [userBrands, setUserBrands] = useState<any[]>([]);
  
  // Fetch brands for brand users with multiple brands
  useEffect(() => {
    if (user && isBrand) {
      // Fetch user's brands
      fetch('/api/brands')
        .then(res => res.json())
        .then(brands => {
          setUserBrands(brands);
          // Set current brand to the first one if not already set
          if (brands.length > 0 && !currentBrandId) {
            setCurrentBrandId(brands[0].id);
          }
        })
        .catch(err => console.error('Failed to fetch brands:', err));
    }
  }, [user, isBrand, currentBrandId]);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  if (!user) {
    return null;
  }
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Generate avatar fallback from user's name
  const initials = user.name ? getInitials(user.name) : '??';
  
  return (
    <div className="h-screen flex flex-col bg-background border-r">
      <div className="p-4 flex justify-center">
        <Link href="/">
          <img 
            src="/assets/IGNYT_Logo Black Web.png" 
            alt="Ignyt Logo" 
            className="h-10 cursor-pointer"
          />
        </Link>
      </div>
      
      {/* User info and brand selector */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            {user.logo ? (
              <AvatarImage src={user.logo} alt={`${user.name} logo`} />
            ) : (
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
        
        {/* Brand selector for brand users with multiple brands */}
        {isBrand && userBrands.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  {(() => {
                    const currentBrand = userBrands.find(b => b.id === currentBrandId);
                    return currentBrand?.logo ? (
                      <>
                        <div className="w-5 h-5 rounded-full overflow-hidden">
                          <img 
                            src={currentBrand.logo} 
                            alt={`${currentBrand.name} logo`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <span className="truncate">{currentBrand.name}</span>
                      </>
                    ) : (
                      <span className="truncate">
                        {currentBrand?.name || 'Select Brand'}
                      </span>
                    );
                  })()}
                </div>
                <Building className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {userBrands.map(brand => (
                <DropdownMenuItem 
                  key={brand.id}
                  onClick={() => setCurrentBrandId(brand.id)}
                  className="flex items-center gap-2"
                >
                  {brand.logo && (
                    <div className="w-4 h-4 rounded-full overflow-hidden">
                      <img 
                        src={brand.logo} 
                        alt={`${brand.name} logo`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  {brand.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Navigation items */}
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          <SidebarItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            href="/" 
            active={location === '/'}
          />
          
          <SidebarItem 
            icon={<Calendar />} 
            label="Content Calendar" 
            href="/content-calendar" 
            active={location === '/content-calendar'}
          />
          
          {/* Brand and Admin only sections */}
          {(isBrand || isAdmin) && (
            <>
              <SidebarItem 
                icon={<Store />} 
                label="Retail Partners" 
                href="/retail-partners" 
                active={location === '/retail-partners'}
              />
              
              <SidebarItem 
                icon={<Flame />} 
                label="Evergreen Content" 
                href="/evergreen-content" 
                active={location === '/evergreen-content'}
              />
            </>
          )}
          
          {/* Accessible to all users */}
          <SidebarItem 
            icon={<Image />} 
            label="Media Library" 
            href="/media-library" 
            active={location === '/media-library'}
          />
          
          <SidebarItem 
            icon={<BarChart3 />} 
            label="Analytics" 
            href="/analytics" 
            active={location === '/analytics'}
          />
          
          {/* Admin only sections */}
          {isAdmin && (
            <SidebarItem 
              icon={<Users />} 
              label="User Management" 
              href="/admin/users" 
              active={location === '/admin/users'}
            />
          )}
          
          <SidebarItem 
            icon={<Settings />} 
            label="Settings" 
            href="/settings" 
            active={location === '/settings'}
          />
        </nav>
      </div>
      
      {/* Logout button */}
      <div className="p-4 border-t border-border">
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-start gap-2"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}