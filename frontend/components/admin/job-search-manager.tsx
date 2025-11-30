'use client';

import { useEffect } from 'react';
import { useJobs } from '@/hooks/useJobs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobSearchSettings } from './jobs/job-search-settings';
import { VacanciesList } from './jobs/vacancies-list';
import { JobStats } from './jobs/job-stats';
import { HHIntegration } from './jobs/hh-integration';
import { JobActivityFeed } from './jobs/job-activity-feed';
import { JobChats } from './jobs/job-chats';
import { JobSearchTags } from './jobs/job-search-tags';
import { JobDailyAnalytics } from './jobs/job-daily-analytics';
import { Settings, Briefcase, MessageCircle, Activity, Tag, Link2, BarChart3 } from 'lucide-react';

export function JobSearchManager() {
  const {
    fetchSearchStatus,
    fetchStats,
    fetchActivity,
    fetchTags,
    fetchChats,
    fetchDailyStats,
    startAutoRefresh,
    stopAutoRefresh
  } = useJobs();

  useEffect(() => {
    // Загружаем все данные при монтировании
    fetchSearchStatus();
    fetchStats();
    fetchActivity(30);
    fetchTags();
    fetchChats();
    fetchDailyStats(14);

    // Запускаем автообновление для real-time эффекта
    startAutoRefresh();

    return () => {
      stopAutoRefresh();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Статистика и лента активности */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <JobStats />
        </div>
        <div className="lg:col-span-1">
          <JobActivityFeed />
        </div>
      </div>

      {/* Табы с основным контентом */}
      <Tabs defaultValue="vacancies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1">
          <TabsTrigger value="vacancies" className="flex items-center gap-2 py-2.5">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Вакансии</span>
          </TabsTrigger>
          <TabsTrigger value="chats" className="flex items-center gap-2 py-2.5">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Чаты</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2 py-2.5">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Теги</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 py-2.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Аналитика</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 py-2.5">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Настройки</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2 py-2.5">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Лента</span>
          </TabsTrigger>
          <TabsTrigger value="hh" className="flex items-center gap-2 py-2.5">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">HH.ru</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vacancies">
          <VacanciesList />
        </TabsContent>

        <TabsContent value="chats">
          <JobChats />
        </TabsContent>

        <TabsContent value="tags">
          <JobSearchTags />
        </TabsContent>

        <TabsContent value="analytics">
          <JobDailyAnalytics fullPage />
        </TabsContent>

        <TabsContent value="settings">
          <JobSearchSettings />
        </TabsContent>

        <TabsContent value="activity">
          <JobActivityFeed fullPage />
        </TabsContent>

        <TabsContent value="hh">
          <HHIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
