'use client';

import { useEffect, useState } from 'react';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ExternalLink, EyeOff, DollarSign, Building, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function VacanciesList() {
  const { vacancies, isLoading, fetchVacancies, fetchVacanciesByStatus, ignoreVacancy } = useJobs();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (statusFilter === 'all') {
      fetchVacancies();
    } else {
      fetchVacanciesByStatus(statusFilter);
    }
  }, [statusFilter]);

  const handleIgnore = async (id: number) => {
    try {
      await ignoreVacancy(id);
      toast.success('Вакансия скрыта');
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      new: { label: 'Новая', variant: 'default' },
      applied: { label: 'Отклик отправлен', variant: 'secondary' },
      viewed: { label: 'Просмотрено', variant: 'outline' },
      invited: { label: 'Приглашение', variant: 'default' },
      rejected: { label: 'Отказ', variant: 'destructive' },
      ignored: { label: 'Скрыта', variant: 'outline' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Найдено вакансий: {vacancies.length}
        </h3>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="new">Новые</SelectItem>
            <SelectItem value="applied">Отправлены</SelectItem>
            <SelectItem value="invited">Приглашения</SelectItem>
            <SelectItem value="rejected">Отказы</SelectItem>
            <SelectItem value="ignored">Скрытые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {vacancies.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Вакансии не найдены</p>
            </CardContent>
          </Card>
        ) : (
          vacancies.map((item, index) => (
            <motion.div
              key={item.vacancy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.vacancy.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        {item.vacancy.company}
                      </div>
                    </div>
                    {getStatusBadge(item.vacancy.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(item.vacancy.salary_from || item.vacancy.salary_to) && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span>
                        {item.vacancy.salary_from && `от ${item.vacancy.salary_from.toLocaleString()}`}
                        {item.vacancy.salary_to && ` до ${item.vacancy.salary_to.toLocaleString()}`}
                        {item.vacancy.salary_currency && ` ${item.vacancy.salary_currency}`}
                      </span>
                    </div>
                  )}

                  {item.vacancy.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.vacancy.description}
                    </p>
                  )}

                  {item.response && (
                    <div className="rounded-lg border bg-muted p-3">
                      <p className="text-xs font-semibold mb-1">Сопроводительное письмо:</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.response.cover_letter}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Найдено: {new Date(item.vacancy.found_at).toLocaleDateString('ru-RU')}
                    {item.vacancy.applied_at && (
                      <> • Отклик: {new Date(item.vacancy.applied_at).toLocaleDateString('ru-RU')}</>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(item.vacancy.url, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Открыть на HH
                    </Button>
                    {item.vacancy.status !== 'ignored' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleIgnore(item.vacancy.id)}
                      >
                        <EyeOff className="mr-2 h-4 w-4" />
                        Скрыть
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
