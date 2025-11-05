"use client";

import { useEffect, useState } from "react";
import { useJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Play, Square, Save } from "lucide-react";
import { toast } from "sonner";

export function JobSearchSettings() {
  const {
    searchStatus,
    startSearch,
    stopSearch,
    updateSettings,
    fetchSearchStatus,
  } = useJobs();
  const [searchText, setSearchText] = useState("");
  const [experience, setExperience] = useState<string>("any");
  const [schedule, setSchedule] = useState<string>("any");
  const [employment, setEmployment] = useState<string>("any");
  const [salaryFrom, setSalaryFrom] = useState("");
  const [onlyWithSalary, setOnlyWithSalary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchStatus?.settings) {
      setSearchText(searchStatus.settings.search_text || "");
      setExperience(searchStatus.settings.experience || "any");
      setSchedule(searchStatus.settings.schedule || "any");
      setEmployment(searchStatus.settings.employment || "any");
      setSalaryFrom(searchStatus.settings.salary_from?.toString() || "");
      setOnlyWithSalary(searchStatus.settings.only_with_salary || false);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Статус поиска</CardTitle>
          <CardDescription>
            Автоматический поиск{" "}
            {searchStatus?.is_active ? "активен" : "остановлен"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleToggleSearch}
            variant={searchStatus?.is_active ? "destructive" : "default"}
            size="lg"
            disabled={!searchStatus?.is_authorized}
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
          {!searchStatus?.is_authorized && (
            <p className="text-sm text-muted-foreground mt-2">
              Подключите HH.ru на вкладке "HH.ru"
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Параметры поиска</CardTitle>
          <CardDescription>
            Настройте критерии для автоматического поиска вакансий
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

          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить настройки
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
