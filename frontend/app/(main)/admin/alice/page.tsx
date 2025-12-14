"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Monitor,
  Send,
  Bell,
  Power,
  Settings,
  History,
  Wifi,
  WifiOff,
  RefreshCw,
  Home,
  Smartphone,
  MessageSquare,
  Globe,
} from "lucide-react";

interface AliceDevice {
  id: string;
  name: string;
  description?: string;
  room?: string;
  device_type: string;
  custom_data?: Record<string, string>;
  capabilities: Array<{
    type: string;
    retrievable: boolean;
    state?: { instance: string; value: unknown };
  }>;
}

interface CommandLog {
  device_id: string;
  command_type: string;
  command_data?: string;
  success: boolean;
  created_at: string;
}

interface Notification {
  id: string;
  message: string;
  notification_type: string;
  created_at: string;
}

export default function AliceAdminPage() {
  const [devices, setDevices] = useState<AliceDevice[]>([]);
  const [commands, setCommands] = useState<CommandLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Device config
  const [pcMac, setPcMac] = useState("");
  const [pcIp, setPcIp] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  // Test forms
  const [testMessage, setTestMessage] = useState("Привет от Алисы!");
  const [testNotification, setTestNotification] = useState("Тестовое уведомление");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [devicesRes, commandsRes, notificationsRes] = await Promise.all([
        fetch("/api/alice/admin/devices"),
        fetch("/api/alice/admin/commands?limit=20"),
        fetch("/api/alice/notifications?limit=10"),
      ]);

      if (devicesRes.ok) {
        const data = await devicesRes.json();
        setDevices(data);

        // Extract config from devices
        const pcDevice = data.find((d: AliceDevice) => d.id === "pc-control");
        if (pcDevice?.custom_data) {
          setPcMac(pcDevice.custom_data.mac || "");
          setPcIp(pcDevice.custom_data.ip || "");
        }

        const tgDevice = data.find((d: AliceDevice) => d.id === "telegram-bot");
        if (tgDevice?.custom_data) {
          setTelegramChatId(tgDevice.custom_data.chat_id || "");
        }
      }

      if (commandsRes.ok) {
        setCommands(await commandsRes.json());
      }

      if (notificationsRes.ok) {
        setNotifications(await notificationsRes.json());
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/alice/notifications?limit=10");
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (error) {
      // Silently fail
    }
  };

  const saveDeviceConfig = async (deviceId: string, config: Record<string, string>) => {
    try {
      const res = await fetch("/api/alice/admin/devices/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, config }),
      });

      if (res.ok) {
        toast.success("Настройки сохранены");
      } else {
        toast.error("Ошибка сохранения");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
  };

  const wakePC = async () => {
    if (!pcMac) {
      toast.error("Укажите MAC-адрес");
      return;
    }

    try {
      const res = await fetch("/api/alice/admin/wake-pc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: pcMac }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Wake-on-LAN пакет отправлен");
      } else {
        toast.error(data.error || "Ошибка");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
  };

  const sendTelegram = async () => {
    try {
      const res = await fetch("/api/alice/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId ? parseInt(telegramChatId) : undefined,
          message: testMessage,
        }),
      });

      if (res.ok) {
        toast.success("Сообщение отправлено");
      } else {
        toast.error("Ошибка отправки");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
  };

  const sendNotification = async () => {
    try {
      const res = await fetch("/api/alice/admin/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testNotification }),
      });

      if (res.ok) {
        toast.success("Уведомление создано");
        loadNotifications();
      } else {
        toast.error("Ошибка создания");
      }
    } catch {
      toast.error("Ошибка соединения");
    }
  };

  const getDeviceIcon = (deviceId: string) => {
    switch (deviceId) {
      case "pc-control":
        return <Monitor className="h-5 w-5" />;
      case "telegram-bot":
        return <MessageSquare className="h-5 w-5" />;
      case "website-notify":
        return <Globe className="h-5 w-5" />;
      default:
        return <Smartphone className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Home className="h-8 w-8" />
            Alice Smart Home
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление умным домом через Яндекс Алису
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">
            <Smartphone className="h-4 w-4 mr-2" />
            Устройства
          </TabsTrigger>
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Тестирование
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            История
          </TabsTrigger>
          <TabsTrigger value="setup">
            <Settings className="h-4 w-4 mr-2" />
            Настройка
          </TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {devices.map((device) => (
              <Card key={device.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getDeviceIcon(device.id)}
                      {device.name}
                    </CardTitle>
                    <Badge variant="secondary">{device.room}</Badge>
                  </div>
                  <CardDescription>{device.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Тип:</span>
                      <span className="font-mono text-xs">
                        {device.device_type.replace("devices.types.", "")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Возможности:</span>
                      <div className="flex gap-1">
                        {device.capabilities.map((cap, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {cap.type.replace("devices.capabilities.", "")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* PC Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Управление ПК
                </CardTitle>
                <CardDescription>
                  Wake-on-LAN для включения компьютера
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={wakePC} className="w-full" disabled={!pcMac}>
                  <Power className="h-4 w-4 mr-2" />
                  Включить ПК
                </Button>
              </CardContent>
            </Card>

            {/* Telegram */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Telegram
                </CardTitle>
                <CardDescription>
                  Отправка сообщений в Telegram
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Сообщение</Label>
                  <Input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Введите сообщение"
                  />
                </div>
                <Button onClick={sendTelegram} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Отправить
                </Button>
              </CardContent>
            </Card>

            {/* Website Notification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Уведомления
                </CardTitle>
                <CardDescription>
                  Уведомления на сайт
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Текст уведомления</Label>
                  <Input
                    value={testNotification}
                    onChange={(e) => setTestNotification(e.target.value)}
                    placeholder="Введите текст"
                  />
                </div>
                <Button onClick={sendNotification} className="w-full">
                  <Bell className="h-4 w-4 mr-2" />
                  Создать уведомление
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Последние уведомления</CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Нет уведомлений
                </p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span>{notif.message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{notif.notification_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>История команд</CardTitle>
              <CardDescription>
                Последние команды от Алисы
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commands.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  История команд пуста
                </p>
              ) : (
                <div className="space-y-2">
                  {commands.map((cmd, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(cmd.device_id)}
                        <div>
                          <span className="font-medium">{cmd.device_id}</span>
                          <span className="text-muted-foreground mx-2">→</span>
                          <span className="font-mono text-sm">
                            {cmd.command_type.replace("devices.capabilities.", "")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cmd.success ? (
                          <Badge className="bg-green-500">OK</Badge>
                        ) : (
                          <Badge variant="destructive">Error</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(cmd.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* PC Control Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Настройки ПК
                </CardTitle>
                <CardDescription>
                  Настройки для Wake-on-LAN и удаленного управления
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>MAC-адрес</Label>
                  <Input
                    value={pcMac}
                    onChange={(e) => setPcMac(e.target.value)}
                    placeholder="00:11:22:33:44:55"
                  />
                  <p className="text-xs text-muted-foreground">
                    MAC-адрес сетевого адаптера ПК для Wake-on-LAN
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>IP-адрес</Label>
                  <Input
                    value={pcIp}
                    onChange={(e) => setPcIp(e.target.value)}
                    placeholder="192.168.1.100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Локальный IP-адрес ПК для проверки статуса
                  </p>
                </div>
                <Button
                  onClick={() =>
                    saveDeviceConfig("pc-control", { mac: pcMac, ip: pcIp })
                  }
                  className="w-full"
                >
                  Сохранить
                </Button>
              </CardContent>
            </Card>

            {/* Telegram Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Настройки Telegram
                </CardTitle>
                <CardDescription>
                  ID чата для отправки сообщений
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chat ID</Label>
                  <Input
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="123456789"
                  />
                  <p className="text-xs text-muted-foreground">
                    Оставьте пустым для использования Admin ID
                  </p>
                </div>
                <Button
                  onClick={() =>
                    saveDeviceConfig("telegram-bot", { chat_id: telegramChatId })
                  }
                  className="w-full"
                >
                  Сохранить
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Integration Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Настройка интеграции с Яндекс Алисой</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>
                  Перейдите в{" "}
                  <a
                    href="https://dialogs.yandex.ru/developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Yandex Dialogs
                  </a>{" "}
                  и создайте новый навык типа "Умный дом"
                </li>
                <li>
                  Укажите URL-ы для интеграции:
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                    <li>
                      <strong>Endpoint URL:</strong>{" "}
                      <code className="bg-muted px-1 rounded">
                        https://your-domain.com/alice/v1.0
                      </code>
                    </li>
                    <li>
                      <strong>Authorization URL:</strong>{" "}
                      <code className="bg-muted px-1 rounded">
                        https://your-domain.com/alice/auth
                      </code>
                    </li>
                    <li>
                      <strong>Token URL:</strong>{" "}
                      <code className="bg-muted px-1 rounded">
                        https://your-domain.com/alice/token
                      </code>
                    </li>
                  </ul>
                </li>
                <li>
                  Укажите Client ID и Client Secret в файле{" "}
                  <code className="bg-muted px-1 rounded">.env</code>
                </li>
                <li>
                  Свяжите аккаунт в приложении Яндекс или на{" "}
                  <a
                    href="https://yandex.ru/quasar/iot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    yandex.ru/quasar/iot
                  </a>
                </li>
                <li>
                  Скажите Алисе: "Алиса, включи компьютер" или "Алиса, отправь
                  сообщение в телеграм"
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
