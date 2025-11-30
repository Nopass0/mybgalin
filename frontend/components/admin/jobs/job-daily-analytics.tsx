"use client";

import { useEffect, useState } from "react";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "motion/react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Search,
  Send,
  PartyPopper,
  XCircle,
  MessageCircle,
  Brain,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyStats } from "@/lib/types";

interface JobDailyAnalyticsProps {
  fullPage?: boolean;
}

export function JobDailyAnalytics({ fullPage = false }: JobDailyAnalyticsProps) {
  const { dailyStats, fetchDailyStats } = useJobs();
  const [days, setDays] = useState<string>("14");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDailyStats(parseInt(days));
  }, [days]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDailyStats(parseInt(days));
    setIsRefreshing(false);
  };

  const calculateTrend = (data: DailyStats[], key: keyof DailyStats): { trend: "up" | "down" | "neutral"; percent: number } => {
    if (data.length < 2) return { trend: "neutral", percent: 0 };

    const recent = data.slice(0, Math.ceil(data.length / 2));
    const older = data.slice(Math.ceil(data.length / 2));

    const recentAvg = recent.reduce((sum, d) => sum + (Number(d[key]) || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + (Number(d[key]) || 0), 0) / older.length;

    if (olderAvg === 0) return { trend: recentAvg > 0 ? "up" : "neutral", percent: 100 };

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    return {
      trend: change > 5 ? "up" : change < -5 ? "down" : "neutral",
      percent: Math.abs(Math.round(change)),
    };
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-3 w-3" />;
      case "down":
        return <ArrowDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "neutral", isPositive: boolean) => {
    if (trend === "neutral") return "text-muted-foreground";
    if (trend === "up") return isPositive ? "text-green-500" : "text-red-500";
    return isPositive ? "text-red-500" : "text-green-500";
  };

  // Calculate totals
  const totals = dailyStats.reduce(
    (acc, day) => ({
      searches: acc.searches + day.searches_count,
      found: acc.found + day.vacancies_found,
      applied: acc.applied + day.applications_sent,
      invited: acc.invited + day.invitations_received,
      rejected: acc.rejected + day.rejections_received,
      messagesSent: acc.messagesSent + day.messages_sent,
      messagesReceived: acc.messagesReceived + day.messages_received,
      telegramInvites: acc.telegramInvites + day.telegram_invites_sent,
    }),
    {
      searches: 0,
      found: 0,
      applied: 0,
      invited: 0,
      rejected: 0,
      messagesSent: 0,
      messagesReceived: 0,
      telegramInvites: 0,
    }
  );

  // Calculate average AI score
  const avgAiScore = dailyStats.length > 0
    ? dailyStats.reduce((sum, d) => sum + (d.avg_ai_score || 0), 0) / dailyStats.filter(d => d.avg_ai_score).length
    : 0;

  const applicationsTrend = calculateTrend(dailyStats, "applications_sent");
  const invitationsTrend = calculateTrend(dailyStats, "invitations_received");

  // Find max values for bar chart scaling
  const maxApplications = Math.max(...dailyStats.map(d => d.applications_sent), 1);
  const maxInvitations = Math.max(...dailyStats.map(d => d.invitations_received), 1);

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Аналитика по дням</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="14">14 дней</SelectItem>
              <SelectItem value="30">30 дней</SelectItem>
              <SelectItem value="60">60 дней</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Откликов</p>
                <p className="text-2xl font-bold">{totals.applied}</p>
              </div>
              <div className={cn("flex items-center gap-1", getTrendColor(applicationsTrend.trend, true))}>
                {getTrendIcon(applicationsTrend.trend)}
                <span className="text-sm font-medium">{applicationsTrend.percent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Приглашений</p>
                <p className="text-2xl font-bold">{totals.invited}</p>
              </div>
              <div className={cn("flex items-center gap-1", getTrendColor(invitationsTrend.trend, true))}>
                {getTrendIcon(invitationsTrend.trend)}
                <span className="text-sm font-medium">{invitationsTrend.percent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Конверсия</p>
                <p className="text-2xl font-bold">
                  {totals.applied > 0 ? Math.round((totals.invited / totals.applied) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Средний AI Score</p>
                <p className="text-2xl font-bold">{avgAiScore > 0 ? avgAiScore.toFixed(1) : "—"}</p>
              </div>
              <Brain className="h-5 w-5 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily breakdown chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Динамика откликов и приглашений</CardTitle>
          <CardDescription>
            Визуализация активности по дням
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
              <p>Нет данных за выбранный период</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Legend */}
              <div className="flex items-center gap-6 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">Отклики</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Приглашения</span>
                </div>
              </div>

              {/* Chart */}
              <div className="space-y-2">
                {[...dailyStats].reverse().map((day, index) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="grid grid-cols-[80px_1fr] gap-3 items-center"
                  >
                    <span className="text-xs text-muted-foreground text-right">
                      {new Date(day.date).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <div className="space-y-1">
                      {/* Applications bar */}
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 bg-blue-500/20 rounded-full overflow-hidden"
                          style={{ width: "100%" }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(day.applications_sent / maxApplications) * 100}%`,
                            }}
                            transition={{ delay: index * 0.03 + 0.2, duration: 0.5 }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                        <span className="text-xs font-medium w-6 text-right">
                          {day.applications_sent}
                        </span>
                      </div>
                      {/* Invitations bar */}
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 bg-green-500/20 rounded-full overflow-hidden"
                          style={{ width: "100%" }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(day.invitations_received / maxInvitations) * 100}%`,
                            }}
                            transition={{ delay: index * 0.03 + 0.3, duration: 0.5 }}
                            className="h-full bg-green-500 rounded-full"
                          />
                        </div>
                        <span className="text-xs font-medium w-6 text-right">
                          {day.invitations_received}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed stats table */}
      {fullPage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Детальная статистика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Дата</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                      <Search className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                      <Send className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                      <PartyPopper className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                      <XCircle className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                      <MessageCircle className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                      <Brain className="h-4 w-4 mx-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...dailyStats].reverse().map((day) => (
                    <tr key={day.date} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-2">
                        {new Date(day.date).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          weekday: "short",
                        })}
                      </td>
                      <td className="text-center py-2 px-2">{day.searches_count}</td>
                      <td className="text-center py-2 px-2">
                        <Badge variant="secondary">{day.applications_sent}</Badge>
                      </td>
                      <td className="text-center py-2 px-2">
                        {day.invitations_received > 0 ? (
                          <Badge className="bg-green-500">{day.invitations_received}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2">
                        {day.rejections_received > 0 ? (
                          <Badge variant="destructive">{day.rejections_received}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2">
                        {day.messages_sent + day.messages_received}
                      </td>
                      <td className="text-center py-2 px-2">
                        {day.avg_ai_score ? (
                          <span className={cn(
                            "font-medium",
                            day.avg_ai_score >= 70 ? "text-green-500" :
                            day.avg_ai_score >= 50 ? "text-amber-500" : "text-red-500"
                          )}>
                            {day.avg_ai_score.toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-medium bg-muted/50">
                    <td className="py-2 px-2">Итого</td>
                    <td className="text-center py-2 px-2">{totals.searches}</td>
                    <td className="text-center py-2 px-2">{totals.applied}</td>
                    <td className="text-center py-2 px-2">{totals.invited}</td>
                    <td className="text-center py-2 px-2">{totals.rejected}</td>
                    <td className="text-center py-2 px-2">{totals.messagesSent + totals.messagesReceived}</td>
                    <td className="text-center py-2 px-2">
                      {avgAiScore > 0 ? avgAiScore.toFixed(0) : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
