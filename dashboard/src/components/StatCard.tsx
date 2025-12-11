import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

const colorClasses = {
  blue: 'bg-black/25 backdrop-blur-md text-blue-300',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-black/25 backdrop-blur-md text-yellow-300',
  red: 'bg-red-900/30 backdrop-blur-md text-red-600',
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 p-3 sm:p-4 md:p-6 cursor-default overflow-hidden relative group">
      {/* Gradient hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 transition-transform duration-200 group-hover:scale-105">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-white/70 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${colorClasses[color]} transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6 flex-shrink-0 ml-2`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
}
