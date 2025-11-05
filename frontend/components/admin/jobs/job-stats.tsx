'use client';

import { useJobs } from '@/hooks/useJobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { motion } from 'motion/react';

export function JobStats() {
  const { stats } = useJobs();

  if (!stats) return null;

  const statItems = [
    {
      title: 'Найдено',
      value: stats.total_found,
      icon: Briefcase,
      color: 'text-blue-500',
    },
    {
      title: 'Откликов',
      value: stats.total_applied,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Приглашений',
      value: stats.invited,
      icon: Eye,
      color: 'text-purple-500',
    },
    {
      title: 'В процессе',
      value: stats.in_progress,
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      title: 'Отказов',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statItems.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
