"use client";

import { useEffect, useState } from "react";
import { useJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Play,
  Square,
  Save,
  Brain,
  Sparkles,
  Clock,
  Zap,
  Settings,
  Search,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function JobSearchSettings() {
  const {
    searchStatus,
    startSearch,
    stopSearch,
    updateSettings,
    fetchSearchStatus,
  } = useJobs();

  // Basic settings
  const [searchText, setSearchText] = useState("");
  const [experience, setExperience] = useState<string>("any");
  const [schedule, setSchedule] = useState<string>("any");
  const [employment, setEmployment] = useState<string>("any");
  const [salaryFrom, setSalaryFrom] = useState("");
  const [onlyWithSalary, setOnlyWithSalary] = useState(false);

  // AI settings
  const [autoTagsEnabled, setAutoTagsEnabled] = useState(true);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [minAiScore, setMinAiScore] = useState(60);
  const [searchIntervalMinutes, setSearchIntervalMinutes] = useState(30);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchStatus?.settings) {
      const s = searchStatus.settings;
      setSearchText(s.search_text || "");
      setExperience(s.experience || "any");
      setSchedule(s.schedule || "any");
      setEmployment(s.employment || "any");
      setSalaryFrom(s.salary_from?.toString() || "");
      setOnlyWithSalary(s.only_with_salary || false);
      setAutoTagsEnabled(s.auto_tags_enabled ?? true);
      setAutoApplyEnabled(s.auto_apply_enabled ?? true);
      setMinAiScore(s.min_ai_score ?? 60);
      setSearchIntervalMinutes(s.search_interval_minutes ?? 30);
    }
  }, [searchStatus]);

  const handleSaveSettings = async () => {
    if (!searchText.trim()) {
      toast.error("Укажите текст для поиска");
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        search_text: searchText,
        experience: experience === "any" ? undefined : experience,
        schedule: schedule === "any" ? undefined : schedule,
        employment: employment === "any" ? undefined : employment,
        salary_from: salaryFrom ? parseInt(salaryFrom) : undefined,
        only_with_salary: onlyWithSalary,
        auto_tags_enabled: autoTagsEnabled,
        auto_apply_enabled: autoApplyEnabled,
        min_ai_score: minAiScore,
        search_interval_minutes: searchIntervalMinutes,
      });
      toast.success("Настройки сохранены");
      await fetchSearchStatus();
    } catch (error) {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSearch = async () => {
    try {
      if (searchStatus?.is_active) {
        await stopSearch();
        toast.success("Поиск остановлен");
      } else {
        if (!searchStatus?.is_authorized) {
          toast.error("Сначала подключите HH.ru");
          return;
        }
        await startSearch();
        toast.success("Поиск запущен");
      }
    } catch (error) {
      toast.error("Ошибка управления поиском");
    }
  };

  const formatNextSearch = () => {
    if (!searchStatus?.next_search_at) return null;
    const next = new Date(searchStatus.next_search_at);
    const now = new Date();
    const diff = next.getTime() - now.getTime();
    if (diff < 0) return "сейчас";
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "менее минуты";
    if (minutes === 1) return "1 минуту";
    if (minutes < 5) return `${minutes} минуты`;
    return `${minutes} минут`;
  };

  return (
    <div className="space-y-6">
      {/* Search Control Card */}
      <Card className="relative overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 opacity-5",
            searchStatus?.is_active
              ? "bg-gradient-to-r from-green-500 to-emerald-500"
              : "bg-gradient-to-r from-gray-500 to-slate-500"
          )}
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {searchStatus?.is_active ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Zap className="h-5 w-5 text-green-500" />
                  </motion.div>
                ) : (
                  <Search className="h-5 w-5 text-muted-foreground" />
                )}
                Автоматический поиск
              </CardTitle>
              <CardDescription className="mt-1">
                {searchStatus?.is_active
                  ? "Бот активно ищет вакансии и отправляет отклики"
                  : "Бот остановлен"}
              </CardDescription>
            </div>
            <Badge
              variant={searchStatus?.is_active ? "default" : "secondary"}
              className={cn(
                "px-3 py-1",
                searchStatus?.is_active && "bg-green-500"
              )}
            >
              {searchStatus?.is_active ? "Активен" : "Остановлен"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleToggleSearch}
              variant={searchStatus?.is_active ? "destructive" : "default"}
              size="lg"
              disabled={!searchStatus?.is_authorized}
              className="min-w-[180px]"
            >
              {searchStatus?.is_active ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Остановить поиск
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Запустить поиск
                </>
              )}
            </Button>

            {searchStatus?.is_active && searchStatus?.next_search_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Следующий поиск через {formatNextSearch()}
              </div>
            )}
          </div>

          {!searchStatus?.is_authorized && (
            <p className="text-sm text-amber-500 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Подключите HH.ru на вкладке "HH.ru" для начала работы
            </p>
          )}

          {searchStatus?.last_search && (
            <p className="text-xs text-muted-foreground">
              Последний поиск: {new Date(searchStatus.last_search).toLocaleString("ru-RU")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Настройки
          </CardTitle>
          <CardDescription>
            Настройте работу искусственного интеллекта для оптимального поиска
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Tags */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Автоматический подбор тегов
              </Label>
              <p className="text-sm text-muted-foreground">
                AI будет автоматически генерировать теги на основе вашего резюме
              </p>
            </div>
            <Switch
              checked={autoTagsEnabled}
              onCheckedChange={setAutoTagsEnabled}
            />
          </div>

          <Separator />

          {/* Auto Apply */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Автоматические отклики
              </Label>
              <p className="text-sm text-muted-foreground">
                AI будет автоматически откликаться на подходящие вакансии
              </p>
            </div>
            <Switch
              checked={autoApplyEnabled}
              onCheckedChange={setAutoApplyEnabled}
            />
          </div>

          <Separator />

          {/* Min AI Score */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-cyan-500" />
                  Минимальный AI Score для отклика
                </Label>
                <p className="text-sm text-muted-foreground">
                  Откликаться только на вакансии с оценкой выше указанной
                </p>
              </div>
              <Badge variant="outline" className="text-lg font-bold px-3">
                {minAiScore}
              </Badge>
            </div>
            <Slider
              value={[minAiScore]}
              onValueChange={(v) => setMinAiScore(v[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 — откликаться на все</span>
              <span>100 — только идеальные</span>
            </div>
          </div>

          <Separator />

          {/* Search Interval */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-violet-500" />
                  Интервал поиска
                </Label>
                <p className="text-sm text-muted-foreground">
                  Как часто бот будет искать новые вакансии
                </p>
              </div>
              <Badge variant="outline" className="text-lg font-bold px-3">
                {searchIntervalMinutes} мин
              </Badge>
            </div>
            <Slider
              value={[searchIntervalMinutes]}
              onValueChange={(v) => setSearchIntervalMinutes(v[0])}
              min={5}
              max={120}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 мин — очень часто</span>
              <span>120 мин — редко</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Parameters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Параметры поиска
          </CardTitle>
          <CardDescription>
            Настройте критерии для автоматического поиска вакансий на HH.ru
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="searchText">Текст поиска *</Label>
            <Input
              id="searchText"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="React Developer, Frontend, Full Stack..."
            />
            <p className="text-xs text-muted-foreground">
              Основной поисковый запрос. AI будет дополнять его тегами автоматически.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Опыт работы</Label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Любой" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Любой</SelectItem>
                  <SelectItem value="noExperience">Без опыта</SelectItem>
                  <SelectItem value="between1And3">От 1 до 3 лет</SelectItem>
                  <SelectItem value="between3And6">От 3 до 6 лет</SelectItem>
                  <SelectItem value="moreThan6">Более 6 лет</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>График работы</Label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger>
                  <SelectValue placeholder="Любой" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Любой</SelectItem>
                  <SelectItem value="fullDay">Полный день</SelectItem>
                  <SelectItem value="shift">Сменный график</SelectItem>
                  <SelectItem value="flexible">Гибкий график</SelectItem>
                  <SelectItem value="remote">Удаленная работа</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип занятости</Label>
              <Select value={employment} onValueChange={setEmployment}>
                <SelectTrigger>
                  <SelectValue placeholder="Любой" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Любой</SelectItem>
                  <SelectItem value="full">Полная занятость</SelectItem>
                  <SelectItem value="part">Частичная занятость</SelectItem>
                  <SelectItem value="project">Проектная работа</SelectItem>
                  <SelectItem value="volunteer">Волонтерство</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Зарплата от (₽)</Label>
              <Input
                id="salary"
                type="number"
                value={salaryFrom}
                onChange={(e) => setSalaryFrom(e.target.value)}
                placeholder="100000"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="onlyWithSalary"
              checked={onlyWithSalary}
              onCheckedChange={setOnlyWithSalary}
            />
            <Label htmlFor="onlyWithSalary" className="cursor-pointer">
              Только вакансии с указанной зарплатой
            </Label>
          </div>

          <Separator />

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full sm:w-auto"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить все настройки
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
