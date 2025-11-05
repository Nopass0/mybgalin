'use client';

import { useEffect } from 'react';
import { useJobs } from '@/hooks/useJobs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobSearchSettings } from './jobs/job-search-settings';
import { VacanciesList } from './jobs/vacancies-list';
import { JobStats } from './jobs/job-stats';
import { HHIntegration } from './jobs/hh-integration';
import { Loader2 } from 'lucide-react';

export function JobSearchManager() {
  const { fetchSearchStatus, fetchStats } = useJobs();

  useEffect(() => {
    fetchSearchStatus();
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <JobStats />

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Настройки</TabsTrigger>
          <TabsTrigger value="vacancies">Вакансии</TabsTrigger>
          <TabsTrigger value="hh">HH.ru</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <JobSearchSettings />
        </TabsContent>

        <TabsContent value="vacancies">
          <VacanciesList />
        </TabsContent>

        <TabsContent value="hh">
          <HHIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
