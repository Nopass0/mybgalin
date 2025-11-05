'use client';

import { useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AboutEditorProps {
  about?: string;
}

export function AboutEditor({ about }: AboutEditorProps) {
  const { createAbout, updateAbout } = usePortfolio();
  const [description, setDescription] = useState(about || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error('Описание не может быть пустым');
      return;
    }

    setSaving(true);
    try {
      if (about) {
        await updateAbout(1, { description });
        toast.success('Описание обновлено');
      } else {
        await createAbout({ description });
        toast.success('Описание создано');
      }
    } catch (error: any) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          placeholder="Расскажите о себе..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
        />
      </div>
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
