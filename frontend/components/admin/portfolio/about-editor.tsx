"use client";

import { useState, useRef, useEffect } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Save,
  Sparkles,
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Link,
  Code,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import axios from "@/lib/axios";

interface AboutEditorProps {
  about?: string;
}

export function AboutEditor({ about }: AboutEditorProps) {
  const { createAbout, updateAbout } = usePortfolio();
  const [description, setDescription] = useState(about || "");
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update description when about prop changes (data loaded from server)
  useEffect(() => {
    if (about !== undefined && about !== null) {
      setDescription(about);
    }
  }, [about]);

  const insertMarkdown = (
    before: string,
    after: string = "",
    placeholder: string = "",
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText =
      description.substring(0, start) +
      before +
      textToInsert +
      after +
      description.substring(end);

    setDescription(newText);

    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSave = async () => {
    if (!description || !description.trim()) {
      toast.error("Описание не может быть пустым");
      return;
    }

    setSaving(true);
    try {
      if (about) {
        await updateAbout(1, { description });
        toast.success("Описание обновлено");
      } else {
        await createAbout({ description });
        toast.success("Описание создано");
      }
    } catch (error: any) {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleImprove = async () => {
    if (!description || !description.trim()) {
      toast.error("Введите текст для улучшения");
      return;
    }

    setImproving(true);
    try {
      const response = await axios.post("/portfolio/improve-about", {
        text: description,
      });

      if (response.data.success && response.data.data?.improved_text) {
        setDescription(response.data.data.improved_text);
        toast.success("Текст улучшен с помощью AI");
      } else {
        toast.error(response.data.error || "Ошибка улучшения текста");
      }
    } catch (error: any) {
      console.error("AI improve error:", error);
      toast.error(error.response?.data?.error || "Ошибка улучшения текста");
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="edit">Редактировать</TabsTrigger>
          <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-2">
          <Label htmlFor="description">
            Описание (поддерживается Markdown)
          </Label>
          <div className="space-y-2">
            {/* Markdown Toolbar */}
            <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md border">
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("**", "**", "жирный текст")}
                  title="Жирный"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("*", "*", "курсив")}
                  title="Курсив"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("# ", "", "Заголовок")}
                  title="Заголовок"
                >
                  <Heading className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("- ", "", "элемент списка")}
                  title="Маркированный список"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("1. ", "", "элемент списка")}
                  title="Нумерованный список"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("[", "](url)", "текст ссылки")}
                  title="Ссылка"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMarkdown("`", "`", "код")}
                  title="Код"
                >
                  <Code className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleImprove}
                disabled={improving || !description || !description.trim()}
                variant="default"
                size="sm"
                className="whitespace-nowrap shrink-0"
              >
                {improving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Улучшение...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Улучшить AI
                  </>
                )}
              </Button>
            </div>

            <Textarea
              ref={textareaRef}
              id="description"
              placeholder="Расскажите о себе..."
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Поддерживается Markdown форматирование
          </p>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
              {description ? (
                <ReactMarkdown>{description}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">
                  Введите текст для предпросмотра
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Сохранение...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </>
        )}
      </Button>
    </div>
  );
}
