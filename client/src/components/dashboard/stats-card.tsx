import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBackground?: string;
  iconColor?: string;
  change?: {
    value: string | number;
    label: string;
    increase?: boolean;
  };
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconBackground = "bg-primary-50",
  iconColor = "text-primary-500",
  change,
}: StatsCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-semibold">{value}</h3>
        </div>
        <div className={cn("p-2 rounded-lg", iconBackground)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      
      {change && (
        <div className="mt-2 flex items-center text-sm">
          <span className={cn(
            "flex items-center",
            change.increase ? "text-accent-500" : "text-red-500"
          )}>
            {change.increase ? "↑" : "↓"} {change.value}
          </span>
          <span className="text-gray-500 ml-2">{change.label}</span>
        </div>
      )}
    </div>
  );
}
