"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import type { PortfolioCase } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Trash2,
  Check,
  X,
  Globe,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface CasesEditorProps {
  cases: PortfolioCase[];
}

export function CasesEditor({ cases }: CasesEditorProps) {
  const { createCase, deleteCase } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mainImage, setMainImage] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMainImage("");
    setWebsiteUrl("");
    setImages([]);
    setImageInput("");
    setShowForm(false);
  };

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setImages([...images, imageInput.trim()]);
      setImageInput("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Заполните название");
      return;
    }

    setSaving(true);
    try {
      await createCase({
        title,
        description: description || undefined,
        main_image: mainImage || undefined,
        website_url: websiteUrl || undefined,
        images,
      });
      toast.success("Кейс добавлен");
      resetForm();
    } catch (error) {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот кейс?")) return;

    try {
      await deleteCase(id);
      toast.success("Кейс удален");
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  };

  return (
    <div className="space-y-4">
      {cases.map((projectCase) => (
        <Card key={projectCase.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {projectCase.main_image && (
                  <div className="relative h-32 w-full rounded-md overflow-hidden bg-muted">
                    <Image
                      src={projectCase.main_image}
                      alt={projectCase.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <h4 className="font-semibold">{projectCase.title}</h4>
                {projectCase.description && (
                  <p className="text-sm text-muted-foreground">
                    {projectCase.description}
                  </p>
                )}
                {projectCase.website_url && (
                  <a
                    href={projectCase.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    {projectCase.website_url}
                  </a>
                )}
                {projectCase.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {projectCase.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative h-16 w-16 rounded border"
                      >
                        <Image
                          src={img}
                          alt={`Image ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(projectCase.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Мой проект"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание проекта..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Главное изображение (URL)</Label>
              <Input
                value={mainImage}
                onChange={(e) => setMainImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Ссылка на сайт</Label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Дополнительные изображения</Label>
              <div className="flex gap-2">
                <Input
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  onKeyPress={(e) => e.key === "Enter" && handleAddImage()}
                />
                <Button
                  type="button"
                  onClick={handleAddImage}
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <div className="h-16 w-16 rounded border overflow-hidden">
                        <Image
                          src={img}
                          alt={`Image ${idx + 1}`}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            className="h-10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить кейс
          </Button>
        </div>
      )}
    </div>
  );
}
