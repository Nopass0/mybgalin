'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import api from '@/lib/axios';
import {
  ShortLink,
  LinkWithStats,
  LinkStats,
  CreateLinkRequest,
  UpdateLinkRequest,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Link2,
  Copy,
  ExternalLink,
  Trash2,
  Edit2,
  BarChart3,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  MousePointerClick,
  Users,
  TrendingUp,
  Loader2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function LinkManager() {
  const [links, setLinks] = useState<LinkWithStats[]>([]);
  const [selectedLink, setSelectedLink] = useState<LinkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateLinkRequest>({
    name: '',
    original_url: '',
    redirect_to_studio: false,
    set_studio_flag: false,
    custom_js: '',
    expires_at: '',
    use_external_shortener: true,
  });

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://bgalin.ru';

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<LinkWithStats[]>('/links/summary');
      setLinks(response.data);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLinkStats = async (id: string) => {
    try {
      const response = await api.get<LinkStats>(`/links/${id}/stats`);
      setSelectedLink(response.data);
      setIsStatsOpen(true);
    } catch (error) {
      console.error('Failed to fetch link stats:', error);
    }
  };

  const createLink = async () => {
    try {
      setIsCreating(true);
      await api.post('/links', formData);
      setIsDialogOpen(false);
      setFormData({
        name: '',
        original_url: '',
        redirect_to_studio: false,
        set_studio_flag: false,
        custom_js: '',
        expires_at: '',
        use_external_shortener: true,
      });
      fetchLinks();
    } catch (error) {
      console.error('Failed to create link:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const updateLink = async (id: string, data: UpdateLinkRequest) => {
    try {
      await api.put(`/links/${id}`, data);
      setEditingLink(null);
      fetchLinks();
    } catch (error) {
      console.error('Failed to update link:', error);
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту ссылку?')) return;
    try {
      await api.delete(`/links/${id}`);
      fetchLinks();
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  };

  const regenerateExternalUrl = async (id: string) => {
    try {
      await api.post(`/links/${id}/regenerate-external`);
      fetchLinks();
    } catch (error) {
      console.error('Failed to regenerate external URL:', error);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getShortUrl = (link: ShortLink) => `${baseUrl}/l/${link.short_code}`;

  const DeviceIcon = ({ type }: { type: string }) => {
    switch (type?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {links.length} ссылок
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {links.reduce((acc, l) => acc + l.total_clicks, 0)} переходов
          </Badge>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Создать ссылку
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Создать короткую ссылку</DialogTitle>
              <DialogDescription>
                Создайте короткую ссылку с отслеживанием и специальными действиями
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название</Label>
                  <Input
                    id="name"
                    placeholder="Моя ссылка"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Срок действия</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="original_url">Целевой URL</Label>
                <Input
                  id="original_url"
                  placeholder="https://example.com/my-page"
                  value={formData.original_url}
                  onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
                />
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">Специальные действия</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Перенаправить на Studio</Label>
                    <p className="text-sm text-muted-foreground">
                      Установить флаг redirect_to_studio в localStorage
                    </p>
                  </div>
                  <Switch
                    checked={formData.redirect_to_studio}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, redirect_to_studio: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Установить флаг Studio</Label>
                    <p className="text-sm text-muted-foreground">
                      Установить флаг studio_redirect в localStorage
                    </p>
                  </div>
                  <Switch
                    checked={formData.set_studio_flag}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, set_studio_flag: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_js">Кастомный JavaScript (опционально)</Label>
                <Textarea
                  id="custom_js"
                  placeholder="// Ваш JavaScript код..."
                  className="font-mono text-sm"
                  rows={4}
                  value={formData.custom_js}
                  onChange={(e) => setFormData({ ...formData, custom_js: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Будет выполнен перед редиректом
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Использовать внешний сократитель (is.gd)</Label>
                  <p className="text-sm text-muted-foreground">
                    Дополнительно сократить через is.gd
                  </p>
                </div>
                <Switch
                  checked={formData.use_external_shortener}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, use_external_shortener: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={createLink} disabled={isCreating || !formData.name || !formData.original_url}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Links List */}
      <div className="space-y-4">
        <AnimatePresence>
          {links.map((item, index) => (
            <motion.div
              key={item.link.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={!item.link.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.link.name}</span>
                        {!item.link.is_active && (
                          <Badge variant="secondary">Неактивна</Badge>
                        )}
                        {item.link.redirect_to_studio && (
                          <Badge variant="outline">Studio Redirect</Badge>
                        )}
                        {item.link.set_studio_flag && (
                          <Badge variant="outline">Studio Flag</Badge>
                        )}
                        {item.link.expires_at && (
                          <Badge variant="outline" className="text-orange-500">
                            <Clock className="mr-1 h-3 w-3" />
                            Истекает
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Короткая:</span>
                          <code className="rounded bg-muted px-2 py-0.5">
                            {getShortUrl(item.link)}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(getShortUrl(item.link), `short-${item.link.id}`)}
                          >
                            {copiedId === `short-${item.link.id}` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {item.link.external_short_url && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">is.gd:</span>
                            <code className="rounded bg-muted px-2 py-0.5">
                              {item.link.external_short_url}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(item.link.external_short_url!, `ext-${item.link.id}`)}
                            >
                              {copiedId === `ext-${item.link.id}` ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => regenerateExternalUrl(item.link.id)}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          <span className="max-w-md truncate">{item.link.original_url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MousePointerClick className="h-4 w-4" />
                          <span>{item.total_clicks} переходов</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{item.clicks_today} сегодня</span>
                        </div>
                        <span>
                          Создана {formatDistanceToNow(new Date(item.link.created_at), {
                            addSuffix: true,
                            locale: ru
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLinkStats(item.link.id)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateLink(item.link.id, { is_active: !item.link.is_active })}
                      >
                        {item.link.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getShortUrl(item.link), '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteLink(item.link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {links.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Link2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Нет коротких ссылок</h3>
              <p className="text-muted-foreground">
                Создайте первую короткую ссылку для отслеживания
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Dialog */}
      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLink && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Статистика: {selectedLink.link.name}
                </DialogTitle>
                <DialogDescription>
                  Подробная аналитика переходов по ссылке
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList>
                  <TabsTrigger value="overview">Обзор</TabsTrigger>
                  <TabsTrigger value="geo">География</TabsTrigger>
                  <TabsTrigger value="tech">Технологии</TabsTrigger>
                  <TabsTrigger value="clicks">Последние клики</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{selectedLink.total_clicks}</div>
                        <p className="text-sm text-muted-foreground">Всего переходов</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{selectedLink.unique_visitors}</div>
                        <p className="text-sm text-muted-foreground">Уникальных</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{selectedLink.clicks_today}</div>
                        <p className="text-sm text-muted-foreground">Сегодня</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{selectedLink.clicks_this_week}</div>
                        <p className="text-sm text-muted-foreground">За неделю</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Переходы по дням</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedLink.clicks_by_day.slice(0, 14).map((day) => (
                          <div key={day.date} className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">{day.date}</span>
                            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${Math.min(100, (day.count / Math.max(...selectedLink.clicks_by_day.map(d => d.count))) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="w-12 text-sm font-medium text-right">{day.count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="geo" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Страны
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedLink.top_countries.map((country) => (
                          <div key={country.country} className="flex items-center gap-2">
                            <span className="w-32 text-sm">{country.country}</span>
                            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{
                                  width: `${(country.count / selectedLink.total_clicks) * 100}%`
                                }}
                              />
                            </div>
                            <span className="w-16 text-sm font-medium text-right">
                              {country.count} ({Math.round((country.count / selectedLink.total_clicks) * 100)}%)
                            </span>
                          </div>
                        ))}
                        {selectedLink.top_countries.length === 0 && (
                          <p className="text-muted-foreground text-sm">Нет данных о географии</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tech" className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Браузеры</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedLink.top_browsers.map((browser) => (
                            <div key={browser.browser} className="flex items-center justify-between">
                              <span className="text-sm">{browser.browser}</span>
                              <Badge variant="secondary">{browser.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Устройства</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedLink.top_devices.map((device) => (
                            <div key={device.device} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DeviceIcon type={device.device} />
                                <span className="text-sm">{device.device}</span>
                              </div>
                              <Badge variant="secondary">{device.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="clicks">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Последние переходы</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Время</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>Браузер</TableHead>
                            <TableHead>ОС</TableHead>
                            <TableHead>Устройство</TableHead>
                            <TableHead>Бот</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLink.recent_clicks.slice(0, 20).map((click) => (
                            <TableRow key={click.id}>
                              <TableCell className="text-sm">
                                {formatDistanceToNow(new Date(click.clicked_at), {
                                  addSuffix: true,
                                  locale: ru,
                                })}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {click.ip_address || '-'}
                              </TableCell>
                              <TableCell>{click.browser || '-'}</TableCell>
                              <TableCell>{click.os || '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DeviceIcon type={click.device_type || ''} />
                                  <span>{click.device_type || '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {click.is_bot ? (
                                  <Badge variant="destructive">Бот</Badge>
                                ) : (
                                  <Badge variant="secondary">Нет</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
