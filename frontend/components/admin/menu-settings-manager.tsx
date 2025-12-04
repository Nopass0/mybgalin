'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Home,
  FileText,
  PackageOpen,
  Palette,
  Store,
  Loader2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  label: string;
  is_visible: boolean;
  display_order: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  resume: FileText,
  workshop: PackageOpen,
  studio: Palette,
  t2: Store,
};

export function MenuSettingsManager() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ data: MenuItem[] }>('/admin/menu-items');
      if (response.data?.data) {
        setMenuItems(response.data.data);
        const settings: Record<string, boolean> = {};
        response.data.data.forEach(item => {
          settings[item.id] = item.is_visible;
        });
        setOriginalSettings(settings);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      toast.error('Не удалось загрузить настройки меню');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id: string, checked: boolean) => {
    setMenuItems(items =>
      items.map(item =>
        item.id === id ? { ...item, is_visible: checked } : item
      )
    );

    // Check if there are changes
    const currentSettings: Record<string, boolean> = {};
    menuItems.forEach(item => {
      currentSettings[item.id] = item.id === id ? checked : item.is_visible;
    });

    const hasAnyChange = Object.keys(currentSettings).some(
      key => currentSettings[key] !== originalSettings[key]
    );
    setHasChanges(hasAnyChange);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const settings: Record<string, boolean> = {};
      menuItems.forEach(item => {
        settings[item.id] = item.is_visible;
      });

      await api.put('/admin/menu-settings', { settings });

      setOriginalSettings(settings);
      setHasChanges(false);
      toast.success('Настройки меню сохранены');
    } catch (error) {
      console.error('Failed to save menu settings:', error);
      toast.error('Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setMenuItems(items =>
      items.map(item => ({
        ...item,
        is_visible: originalSettings[item.id] ?? true,
      }))
    );
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Видимость пунктов меню
          </CardTitle>
          <CardDescription>
            Включите или отключите отображение пунктов в боковом меню сайта
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {menuItems.map((item, index) => {
            const Icon = iconMap[item.id] || Home;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${item.is_visible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">{item.label}</Label>
                    <p className="text-sm text-muted-foreground">
                      {item.is_visible ? (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Отображается в меню
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOff className="h-3 w-3" /> Скрыто из меню
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={item.is_visible}
                  onCheckedChange={(checked) => handleToggle(item.id, checked)}
                />
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-4">
        {hasChanges && (
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Сбросить изменения
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
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
      </div>

      {/* Info card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Примечание:</strong> Изменения вступят в силу сразу после сохранения.
            Скрытые пункты меню всё ещё будут доступны по прямой ссылке, но не будут
            отображаться в боковом меню сайта.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
