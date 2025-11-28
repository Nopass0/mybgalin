"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  FolderSync,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Monitor,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_BASE = "";

interface SyncClient {
  id: string;
  deviceName: string;
  lastSyncAt: string | null;
  createdAt: string;
}

interface SyncFolder {
  id: string;
  name: string;
  apiKey: string;
  apiUrl: string;
  clientCount: number;
  fileCount: number;
  totalSize: number;
  createdAt: string;
  updatedAt: string;
  clients: SyncClient[];
}

export function SyncFolderManager() {
  const [folders, setFolders] = useState<SyncFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFolders = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE}/api/sync/folders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFolders(data.data.folders);
        }
      }
    } catch (error) {
      console.error("Failed to fetch sync folders:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить папки синхронизации",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE}/api/sync/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchFolders();
          setNewFolderName("");
          setCreateDialogOpen(false);
          toast({
            title: "Успешно",
            description: "Папка синхронизации создана",
          });
        }
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать папку",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE}/api/sync/folders/${folderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchFolders();
        toast({
          title: "Успешно",
          description: "Папка удалена",
        });
      }
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить папку",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateKey = async (folderId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE}/api/sync/folders/${folderId}/regenerate-key`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await fetchFolders();
        toast({
          title: "Успешно",
          description: "API ключ обновлен",
        });
      }
    } catch (error) {
      console.error("Failed to regenerate key:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить ключ",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (folderId: string, clientId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE}/api/sync/clients/${clientId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await fetchFolders();
        toast({
          title: "Успешно",
          description: "Устройство отключено",
        });
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отключить устройство",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FolderSync className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Папки синхронизации</h2>
            <p className="text-sm text-muted-foreground">
              Управление облачной синхронизацией файлов
            </p>
          </div>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Создать папку
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая папка синхронизации</DialogTitle>
              <DialogDescription>
                Создайте папку для синхронизации файлов между устройствами
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название папки</Label>
                <Input
                  id="name"
                  placeholder="Мои документы"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button onClick={handleCreateFolder} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Folders List */}
      {folders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderSync className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Нет папок синхронизации
            </p>
            <p className="text-sm text-muted-foreground/70 text-center mt-1">
              Создайте первую папку для начала работы
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {folders.map((folder) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpanded(folder.id)}
                        className="p-1 hover:bg-accent rounded transition-colors"
                      >
                        {expandedFolders.has(folder.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <CardTitle className="text-lg">{folder.name}</CardTitle>
                        <CardDescription className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1">
                            <Monitor className="h-3 w-3" />
                            {folder.clientCount} устройств
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {folder.fileCount} файлов
                          </span>
                          <span>{formatBytes(folder.totalSize)}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Обновить API ключ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Все подключенные устройства будут отключены и
                              потребуют повторной настройки с новым ключом.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRegenerateKey(folder.id)}
                            >
                              Обновить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Удалить папку &quot;{folder.name}&quot;?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Все файлы в папке и подключенные устройства будут
                              удалены. Это действие нельзя отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFolder(folder.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {expandedFolders.has(folder.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 space-y-4">
                        {/* API Key Section */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            API URL
                          </Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-muted rounded text-sm font-mono truncate">
                              {folder.apiUrl}
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                copyToClipboard(folder.apiUrl, `url-${folder.id}`)
                              }
                            >
                              {copiedKey === `url-${folder.id}` ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            API Key
                          </Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-muted rounded text-sm font-mono truncate">
                              {folder.apiKey}
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                copyToClipboard(folder.apiKey, `key-${folder.id}`)
                              }
                            >
                              {copiedKey === `key-${folder.id}` ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Download Client */}
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">
                              Скачать клиент синхронизации
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Установите на ваш компьютер для автоматической
                              синхронизации
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href="/downloads/cloud-sync.exe"
                              download
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Windows
                            </a>
                          </Button>
                        </div>

                        {/* Connected Clients */}
                        {folder.clients.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Подключенные устройства
                            </Label>
                            <div className="space-y-2">
                              {folder.clients.map((client) => (
                                <div
                                  key={client.id}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <Monitor className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">
                                        {client.deviceName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {client.lastSyncAt
                                          ? `Синхронизация: ${formatDate(
                                              client.lastSyncAt
                                            )}`
                                          : "Ещё не синхронизировано"}
                                      </p>
                                    </div>
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Отключить устройство?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Устройство &quot;{client.deviceName}
                                          &quot; будет отключено от синхронизации.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Отмена
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteClient(
                                              folder.id,
                                              client.id
                                            )
                                          }
                                        >
                                          Отключить
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Creation Date */}
                        <p className="text-xs text-muted-foreground">
                          Создано: {formatDate(folder.createdAt)}
                        </p>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
