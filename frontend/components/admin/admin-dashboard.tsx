'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortfolioManager } from './portfolio-manager';
import { JobSearchManager } from './job-search-manager';
import { SyncFolderManager } from './sync-folder-manager';
import { DatabaseViewer } from './database-viewer';
import { ServerConsole } from './server-console';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Briefcase, Cloud, Database, Terminal, FileText } from 'lucide-react';

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
            Управление сервером и данными
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
        <Tabs defaultValue="console" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[700px]">
            <TabsTrigger value="console" className="gap-2">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">Консоль</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">База данных</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Портфолио</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Работа</span>
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-2">
              <Cloud className="h-4 w-4" />
              <span className="hidden sm:inline">Синхронизация</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="console" className="space-y-6">
            <ServerConsole />
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <DatabaseViewer />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <PortfolioManager />
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <JobSearchManager />
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">
            <SyncFolderManager />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
