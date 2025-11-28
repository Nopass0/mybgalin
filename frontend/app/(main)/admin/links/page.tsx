'use client';

import { motion } from 'motion/react';
import { LinkManager } from '@/components/admin/link-manager';
import { Link2 } from 'lucide-react';

export default function LinksPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Link2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Сократитель ссылок</h1>
            <p className="text-muted-foreground">
              Создание коротких ссылок с аналитикой и специальными действиями
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <LinkManager />
      </motion.div>
    </div>
  );
}
