import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RetailPartner } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface PartnerStatusProps {
  partners: {
    active: number;
    pending: number;
    needs_attention: number;
    inactive: number;
  };
  recentPartners: RetailPartner[];
  loading?: boolean;
}

export function PartnerStatus({ partners, recentPartners, loading = false }: PartnerStatusProps) {
  // Function to get initials from partner name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Function to format connection date
  const formatConnectionDate = (date: Date | string | undefined) => {
    if (!date) return "Not connected";
    
    const connectionDate = new Date(date);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - connectionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return "Connected today";
    } else if (diffInDays === 1) {
      return "Connected yesterday";
    } else if (diffInDays < 7) {
      return `Connected ${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `Connected ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      return `Connected ${Math.floor(diffInDays / 30)} months ago`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="h-5 w-32 bg-gray-300 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-gray-300 rounded-full" />
                <div className="ml-2 h-4 w-24 bg-gray-300 rounded animate-pulse" />
              </div>
              <div className="h-4 w-6 bg-gray-300 rounded animate-pulse" />
            </div>
          ))}
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="h-4 w-32 bg-gray-300 rounded animate-pulse mb-4" />
            
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center py-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />
                <div className="ml-3 space-y-1">
                  <div className="h-4 w-28 bg-gray-300 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-6 border-b border-gray-200 flex justify-between items-center">
        <CardTitle>Retail Partners</CardTitle>
        <Button variant="link" className="text-primary-500 hover:text-primary-600 font-medium text-sm p-0">
          Invite New
        </Button>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="ml-2 text-gray-600">Active</span>
          </div>
          <span className="text-gray-800 font-medium">{partners.active}</span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="ml-2 text-gray-600">Pending</span>
          </div>
          <span className="text-gray-800 font-medium">{partners.pending}</span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="ml-2 text-gray-600">Need Attention</span>
          </div>
          <span className="text-gray-800 font-medium">{partners.needs_attention}</span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <span className="ml-2 text-gray-600">Inactive</span>
          </div>
          <span className="text-gray-800 font-medium">{partners.inactive}</span>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-2">
          <p className="text-gray-600 mb-2">Recent Connections</p>
          
          {recentPartners.map((partner) => (
            <div key={partner.id} className="flex items-center py-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                {getInitials(partner.name)}
              </div>
              <div className="ml-3">
                <p className="text-gray-800">{partner.name}</p>
                <p className="text-xs text-gray-500">{formatConnectionDate(partner.connectionDate)}</p>
              </div>
            </div>
          ))}
          
          <div className="mt-4 text-center">
            <a href="/partners" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
              View All Partners
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
