'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortfolioManager } from './portfolio-manager';
import { JobSearchManager } from './job-search-manager';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';

export function AdminDashboard() {
  const { logout } = useAuth();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Админка</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Управление портфолио и поиском работы
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="portfolio">Портфолио</TabsTrigger>
            <TabsTrigger value="jobs">Поиск работы</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            <PortfolioManager />
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <JobSearchManager />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
