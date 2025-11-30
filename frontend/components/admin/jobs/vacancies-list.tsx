"use client";

import React, { useEffect, useState } from "react";
import { useJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  ExternalLink,
  EyeOff,
  DollarSign,
  Building,
  Calendar,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { VacancyWithResponse } from "@/lib/types";

export function VacanciesList() {
  const {
    vacancies,
    isLoading,
    fetchVacancies,
    fetchVacanciesByStatus,
    ignoreVacancy,
  } = useJobs();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (statusFilter === "all") {
      fetchVacancies();
    } else {
      fetchVacanciesByStatus(statusFilter);
    }
  }, [statusFilter]);

  const handleIgnore = async (id: number) => {
    try {
      await ignoreVacancy(id);
      toast.success("Вакансия скрыта");
    } catch (error) {
      toast.error("Ошибка");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
        className?: string;
      }
    > = {
      found: { label: "Новая", variant: "default", className: "bg-blue-500" },
      applied: { label: "Отклик отправлен", variant: "secondary" },
      viewed: { label: "Просмотрено", variant: "outline" },
      invited: { label: "Приглашение", variant: "default", className: "bg-green-500" },
      rejected: { label: "Отказ", variant: "destructive" },
      ignored: { label: "Скрыта", variant: "outline" },
    };

    const config = statusConfig[status] || {
      label: status,
      variant: "outline",
    };
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getAIScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getAIScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10";
    if (score >= 60) return "bg-amber-500/10";
    if (score >= 40) return "bg-orange-500/10";
    return "bg-red-500/10";
  };

  const getPriorityStars = (priority: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-3 w-3",
          i < priority ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
        )}
      />
    ));
  };

  const parseJsonArray = (jsonStr?: string): string[] => {
    if (!jsonStr) return [];
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
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
            <SelectItem value="found">Новые</SelectItem>
            <SelectItem value="applied">Отправлены</SelectItem>
            <SelectItem value="viewed">Просмотрены</SelectItem>
            <SelectItem value="invited">Приглашения</SelectItem>
            <SelectItem value="rejected">Отказы</SelectItem>
            <SelectItem value="ignored">Скрытые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {vacancies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">Вакансии не найдены</p>
                <p className="text-sm">Запустите поиск на вкладке "Настройки"</p>
              </CardContent>
            </Card>
          ) : (
            vacancies.map((item, index) => (
              <VacancyCard
                key={item.vacancy.id}
                item={item}
                index={index}
                isExpanded={expandedId === item.vacancy.id}
                onToggleExpand={() =>
                  setExpandedId(
                    expandedId === item.vacancy.id ? null : item.vacancy.id
                  )
                }
                onIgnore={handleIgnore}
                getStatusBadge={getStatusBadge}
                getAIScoreColor={getAIScoreColor}
                getAIScoreBg={getAIScoreBg}
                getPriorityStars={getPriorityStars}
                parseJsonArray={parseJsonArray}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface VacancyCardProps {
  item: VacancyWithResponse;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onIgnore: (id: number) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getAIScoreColor: (score: number) => string;
  getAIScoreBg: (score: number) => string;
  getPriorityStars: (priority: number) => React.ReactNode[];
  parseJsonArray: (jsonStr?: string) => string[];
}

function VacancyCard({
  item,
  index,
  isExpanded,
  onToggleExpand,
  onIgnore,
  getStatusBadge,
  getAIScoreColor,
  getAIScoreBg,
  getPriorityStars,
  parseJsonArray,
}: VacancyCardProps) {
  const matchReasons = parseJsonArray(item.vacancy.ai_match_reasons);
  const concerns = parseJsonArray(item.vacancy.ai_concerns);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg truncate">
                  {item.vacancy.title}
                </CardTitle>
                {item.vacancy.ai_priority && item.vacancy.ai_priority >= 4 && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 shrink-0">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Топ
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <span className="truncate">{item.vacancy.company}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* AI Score Badge */}
              {item.vacancy.ai_score && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
                    getAIScoreBg(item.vacancy.ai_score)
                  )}
                >
                  <Brain className={cn("h-4 w-4", getAIScoreColor(item.vacancy.ai_score))} />
                  <span className={cn("font-semibold", getAIScoreColor(item.vacancy.ai_score))}>
                    {item.vacancy.ai_score}
                  </span>
                </div>
              )}
              {getStatusBadge(item.vacancy.status)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Priority Stars & Salary Row */}
          <div className="flex items-center justify-between">
            {item.vacancy.ai_priority && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Приоритет:</span>
                <div className="flex">{getPriorityStars(item.vacancy.ai_priority)}</div>
              </div>
            )}
            {(item.vacancy.salary_from || item.vacancy.salary_to) && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  {item.vacancy.salary_from &&
                    `от ${item.vacancy.salary_from.toLocaleString()}`}
                  {item.vacancy.salary_to &&
                    ` до ${item.vacancy.salary_to.toLocaleString()}`}
                  {item.vacancy.salary_currency &&
                    ` ${item.vacancy.salary_currency}`}
                </span>
                {item.vacancy.ai_salary_assessment && (
                  <span className="text-xs text-muted-foreground">
                    ({item.vacancy.ai_salary_assessment})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* AI Recommendation */}
          {item.vacancy.ai_recommendation && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Рекомендация</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.vacancy.ai_recommendation}
              </p>
            </div>
          )}

          {/* Expandable AI Details */}
          {(matchReasons.length > 0 || concerns.length > 0) && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="w-full justify-between text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI анализ вакансии
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-4 md:grid-cols-2 pt-3">
                      {/* Match Reasons */}
                      {matchReasons.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                            <CheckCircle2 className="h-4 w-4" />
                            Почему подходит
                          </div>
                          <ul className="space-y-1">
                            {matchReasons.map((reason, i) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                              >
                                <span className="text-green-500 mt-1">•</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Concerns */}
                      {concerns.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
                            <AlertCircle className="h-4 w-4" />
                            На что обратить внимание
                          </div>
                          <ul className="space-y-1">
                            {concerns.map((concern, i) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                              >
                                <span className="text-amber-500 mt-1">•</span>
                                {concern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Cover Letter */}
          {item.response && item.response.cover_letter && (
            <Dialog>
              <DialogTrigger asChild>
                <div className="rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <p className="text-xs font-semibold mb-1 flex items-center gap-2">
                    <MessageCircle className="h-3 w-3" />
                    Сопроводительное письмо
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.response.cover_letter}
                  </p>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Сопроводительное письмо</DialogTitle>
                  <DialogDescription>
                    Отправлено для вакансии "{item.vacancy.title}"
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <p className="text-sm whitespace-pre-wrap">
                    {item.response.cover_letter}
                  </p>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Найдено:{" "}
              {new Date(item.vacancy.found_at).toLocaleDateString("ru-RU")}
              {item.vacancy.applied_at && (
                <>
                  {" "}• Отклик:{" "}
                  {new Date(item.vacancy.applied_at).toLocaleDateString("ru-RU")}
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(item.vacancy.url, "_blank")}
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                HH.ru
              </Button>
              {item.vacancy.status !== "ignored" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onIgnore(item.vacancy.id)}
                >
                  <EyeOff className="mr-2 h-3 w-3" />
                  Скрыть
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
