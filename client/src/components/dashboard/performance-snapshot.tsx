import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface PerformanceMetric {
  name: string;
  current: number;
  previous: number;
  change: number;
  color: string;
}

interface PerformanceSnapshotProps {
  metrics: PerformanceMetric[];
  loading?: boolean;
}

export function PerformanceSnapshot({ metrics, loading = false }: PerformanceSnapshotProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Performance Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-6 space-y-2">
              <div className="flex justify-between mb-2">
                <div className="h-4 w-32 bg-gray-300 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-300 rounded animate-pulse" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2" />
              <div className="h-3 w-36 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
          <div className="h-8 w-full bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-6 border-b border-gray-200">
        <CardTitle>Performance Snapshot</CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {metrics.map((metric, index) => (
          <div key={index} className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">{metric.name}</span>
              <span className="text-gray-800 font-medium">{metric.current}%</span>
            </div>
            <Progress value={metric.current * 10} className="h-2" indicatorClassName={metric.color} />
            <div className="text-xs text-gray-500 mt-1">
              <span className="text-accent-500">↑ {metric.change}%</span> from previous period
            </div>
          </div>
        ))}
        
        <Button variant="outline" className="w-full mt-4">View Full Analytics</Button>
      </CardContent>
    </Card>
  );
}
