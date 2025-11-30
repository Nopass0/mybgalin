"use client";

import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "motion/react";
import {
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  PartyPopper,
  MessageCircle,
  Send,
  Brain,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function JobStats() {
  const { stats } = useJobs();

  if (!stats) return null;

  const primaryStats = [
    {
      title: "Найдено",
      value: stats.total_found,
      icon: Briefcase,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Откликов",
      value: stats.total_applied,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Приглашений",
      value: stats.invited,
      icon: PartyPopper,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "В процессе",
      value: stats.in_progress,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Отказов",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  const responseRate = stats.response_rate ??
    (stats.total_applied > 0
      ? Math.round((stats.invited / stats.total_applied) * 100)
      : 0);

  return (
    <div className="space-y-6">
      {/* Primary stats grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {primaryStats.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", item.bgColor)}>
                  <item.icon className={cn("h-4 w-4", item.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* AI Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Средний AI Score
              </CardTitle>
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Brain className="h-4 w-4 text-cyan-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">
                  {stats.avg_ai_score ? stats.avg_ai_score.toFixed(1) : "—"}
                </span>
                <span className="text-sm text-muted-foreground mb-1">/ 100</span>
              </div>
              {stats.avg_ai_score && (
                <Progress
                  value={stats.avg_ai_score}
                  className="mt-2 h-2"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Response Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Отклик работодателей
              </CardTitle>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">{responseRate}%</span>
              </div>
              <Progress
                value={responseRate}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Chats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Активных чатов
              </CardTitle>
              <div className="p-2 rounded-lg bg-violet-500/10">
                <MessageCircle className="h-4 w-4 text-violet-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_chats}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.telegram_invites_sent} приглашений в Telegram
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Откликов за период
              </CardTitle>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Zap className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Сегодня</span>
                  </div>
                  <span className="text-xl font-bold">{stats.today_applications}</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="flex items-center gap-1">
                    <Send className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Неделя</span>
                  </div>
                  <span className="text-xl font-bold">{stats.this_week_applications}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
