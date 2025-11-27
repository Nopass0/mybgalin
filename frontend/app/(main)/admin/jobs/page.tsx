'use client';

import { motion } from 'motion/react';
import { JobSearchManager } from '@/components/admin/job-search-manager';
import { Search } from 'lucide-react';

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Поиск работы</h1>
            <p className="text-muted-foreground">
              Автоматический поиск вакансий и управление откликами
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <JobSearchManager />
      </motion.div>
    </div>
  );
}
