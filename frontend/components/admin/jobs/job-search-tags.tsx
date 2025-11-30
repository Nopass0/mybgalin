"use client";

import { useState } from "react";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "motion/react";
import {
  Tag,
  Sparkles,
  Loader2,
  Trash2,
  Search,
  Briefcase,
  Building,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function JobSearchTags() {
  const { tags, generateTags, toggleTag, deleteTag } = useJobs();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTags = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTags();
      if (result) {
        toast.success(`AI сгенерировал ${result.suggested_queries.length} поисковых запросов`);
      }
    } catch (error) {
      toast.error("Ошибка генерации тегов");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleTag(id);
    } catch (error) {
      toast.error("Ошибка обновления тега");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTag(id);
      toast.success("Тег удален");
    } catch (error) {
      toast.error("Ошибка удаления тега");
    }
  };

  const getTagTypeIcon = (type: string) => {
    switch (type) {
      case "primary":
        return <Briefcase className="h-4 w-4" />;
      case "skill":
        return <BarChart3 className="h-4 w-4" />;
      case "industry":
        return <Building className="h-4 w-4" />;
      case "query":
        return <Search className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  const getTagTypeLabel = (type: string) => {
    switch (type) {
      case "primary":
        return "Должность";
      case "skill":
        return "Навык";
      case "industry":
        return "Отрасль";
      case "query":
        return "Запрос";
      default:
        return type;
    }
  };

  const getTagTypeColor = (type: string) => {
    switch (type) {
      case "primary":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "skill":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "industry":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "query":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const groupedTags = tags.reduce(
    (acc, tag) => {
      if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
      acc[tag.tag_type].push(tag);
      return acc;
    },
    {} as Record<string, typeof tags>
  );

  return (
    <div className="space-y-6">
      {/* Кнопка генерации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-генерация тегов
          </CardTitle>
          <CardDescription>
            Нейросеть проанализирует ваше резюме и создаст оптимальные поисковые запросы для hh.ru
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerateTags}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Сгенерировать теги из резюме
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Теги по категориям */}
      {Object.entries(groupedTags).map(([type, typeTags]) => (
        <Card key={type}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className={cn("p-2 rounded-lg", getTagTypeColor(type))}>
                {getTagTypeIcon(type)}
              </div>
              {getTagTypeLabel(type)}
              <Badge variant="secondary" className="ml-auto">
                {typeTags.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {typeTags.map((tag, index) => (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      tag.is_active
                        ? "bg-background"
                        : "bg-muted/50 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={tag.is_active}
                        onCheckedChange={() => handleToggle(tag.id)}
                      />
                      <div>
                        <p className="font-medium">{tag.value}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            {tag.search_count} поисков
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {tag.found_count} найдено
                          </span>
                          <span className="flex items-center gap-1 text-green-500">
                            {tag.applied_count} откликов
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tag.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      ))}

      {tags.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Tag className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">Нет тегов для поиска</p>
            <p className="text-sm text-center max-w-md">
              Нажмите кнопку выше, чтобы AI сгенерировал теги на основе вашего резюме,
              или добавьте текст поиска вручную в настройках
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
