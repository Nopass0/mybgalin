"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import type { PortfolioSkill } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

interface SkillsEditorProps {
  skills: PortfolioSkill[];
}

export function SkillsEditor({ skills }: SkillsEditorProps) {
  const { createSkill, deleteSkill } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setCategory("");
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !category.trim()) {
      toast.error("Заполните все поля");
      return;
    }

    setSaving(true);
    try {
      await createSkill({ name, category });
      toast.success("Навык добавлен");
      resetForm();
    } catch (error) {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSkill(id);
      toast.success("Навык удален");
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  };

  const groupSkillsByCategory = () => {
    const grouped: Record<string, PortfolioSkill[]> = {};
    skills.forEach((skill) => {
      if (!grouped[skill.category]) {
        grouped[skill.category] = [];
      }
      grouped[skill.category].push(skill);
    });
    return grouped;
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupSkillsByCategory()).map(([cat, categorySkills]) => (
        <Card key={cat}>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">{cat}</h4>
            <div className="flex flex-wrap gap-2">
              {categorySkills.map((skill) => (
                <Badge key={skill.id} variant="secondary" className="gap-1">
                  {skill.name}
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Frontend, Backend, Tools..."
              />
            </div>
            <div className="space-y-2">
              <Label>Навык</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="React, Node.js, Docker..."
              />
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
            Добавить навык
          </Button>
        </div>
      )}
    </div>
  );
}
