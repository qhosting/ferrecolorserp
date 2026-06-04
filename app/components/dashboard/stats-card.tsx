
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: {
    value: number;
    label: string;
  };
}

const colorClasses = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-green-600 bg-green-50',
  yellow: 'text-yellow-600 bg-yellow-50',
  red: 'text-red-600 bg-red-50',
  purple: 'text-purple-600 bg-purple-50',
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'blue',
  trend,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="flex items-center justify-between mt-2">
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
          {trend && (
            <div className={cn(
              'text-xs px-2 py-1 rounded-full',
              trend.value >= 0 
                ? 'text-green-600 bg-green-50' 
                : 'text-red-600 bg-red-50'
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
