'use client';

import { useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import type { PortfolioContact } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ContactsEditorProps {
  contacts: PortfolioContact[];
}

export function ContactsEditor({ contacts }: ContactsEditorProps) {
  const { createContact, updateContact, deleteContact } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [contactType, setContactType] = useState('email');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setContactType('email');
    setValue('');
    setLabel('');
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (contact: PortfolioContact) => {
    setEditingId(contact.id);
    setContactType(contact.contact_type);
    setValue(contact.value);
    setLabel(contact.label || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error('Значение не может быть пустым');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateContact(editingId, { contact_type: contactType, value, label: label || undefined });
        toast.success('Контакт обновлен');
      } else {
        await createContact({ contact_type: contactType, value, label: label || undefined });
        toast.success('Контакт добавлен');
      }
      resetForm();
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот контакт?')) return;

    try {
      await deleteContact(id);
      toast.success('Контакт удален');
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="space-y-4">
      {contacts.map((contact) => (
        <Card key={contact.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium capitalize">{contact.contact_type}</p>
              {contact.label && <p className="text-xs text-muted-foreground">{contact.label}</p>}
              <p className="text-sm">{contact.value}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
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
              <Label>Тип контакта</Label>
              <Select value={contactType} onValueChange={setContactType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Телефон</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Значение</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Метка (опционально)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Например: Личный email" />
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
          Добавить контакт
        </Button>
      )}
    </div>
  );
}
