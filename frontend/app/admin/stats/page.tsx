"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import axios from "@/lib/axios";
import { toast } from "sonner";

interface JobStats {
  total_found: number;
  total_applied: number;
  invited: number;
  rejected: number;
  in_progress: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/jobs/stats");
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        toast.error(response.data.error || "Ошибка загрузки статистики");
      }
    } catch (error) {
      toast.error("Ошибка загрузки статистики");
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Статистика</h1>
            <p className="text-muted-foreground">
              Аналитика по поиску работы и откликам
            </p>
          </div>
        </div>
      </motion.div>

      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {/* Total Found */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Найдено вакансий
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_found}</div>
              <p className="text-xs text-muted-foreground">
                Всего вакансий в системе
              </p>
            </CardContent>
          </Card>

          {/* Total Applied */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Отправлено откликов
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_applied}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_found > 0
                  ? `${calculatePercentage(stats.total_applied, stats.total_found)}% от найденных`
                  : "Нет вакансий"}
              </p>
            </CardContent>
          </Card>

          {/* Invited */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Приглашений</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.invited}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total_applied > 0
                  ? `${calculatePercentage(stats.invited, stats.total_applied)}% от откликов`
                  : "Нет откликов"}
              </p>
            </CardContent>
          </Card>

          {/* Rejected */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Отказов</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.rejected}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total_applied > 0
                  ? `${calculatePercentage(stats.rejected, stats.total_applied)}% от откликов`
                  : "Нет откликов"}
              </p>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">В процессе</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.in_progress}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total_applied > 0
                  ? `${calculatePercentage(stats.in_progress, stats.total_applied)}% от откликов`
                  : "Нет откликов"}
              </p>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Конверсия в приглашения
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_applied > 0
                  ? `${calculatePercentage(stats.invited, stats.total_applied)}%`
                  : "0%"}
              </div>
              <p className="text-xs text-muted-foreground">
                Эффективность откликов
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
