'use client';

import { useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import type { PortfolioExperience } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Edit, Check, X, Calendar, Building } from 'lucide-react';
import { toast } from 'sonner';

interface ExperienceEditorProps {
  experience: PortfolioExperience[];
}

export function ExperienceEditor({ experience }: ExperienceEditorProps) {
  const { createExperience, updateExperience, deleteExperience } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle('');
    setCompany('');
    setDateFrom('');
    setDateTo('');
    setDescription('');
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (exp: PortfolioExperience) => {
    setEditingId(exp.id);
    setTitle(exp.title);
    setCompany(exp.company);
    setDateFrom(exp.date_from);
    setDateTo(exp.date_to || '');
    setDescription(exp.description || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !company.trim() || !dateFrom.trim()) {
      toast.error('Заполните обязательные поля');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title,
        company,
        date_from: dateFrom,
        date_to: dateTo || undefined,
        description: description || undefined,
      };

      if (editingId) {
        await updateExperience(editingId, data);
        toast.success('Опыт обновлен');
      } else {
        await createExperience(data);
        toast.success('Опыт добавлен');
      }
      resetForm();
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот опыт работы?')) return;

    try {
      await deleteExperience(id);
      toast.success('Опыт удален');
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="space-y-4">
      {experience.map((exp) => (
        <Card key={exp.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold">{exp.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  {exp.company}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {exp.date_from} — {exp.date_to || 'настоящее время'}
                </div>
                {exp.description && (
                  <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {showForm ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Должность *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Developer" />
            </div>
            <div className="space-y-2">
              <Label>Компания *</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Google" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Дата начала *</Label>
                <Input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Январь 2020" />
              </div>
              <div className="space-y-2">
                <Label>Дата окончания</Label>
                <Input value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Декабрь 2023 или пусто" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Обязанности и достижения..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Добавить опыт работы
        </Button>
      )}
    </div>
  );
}
