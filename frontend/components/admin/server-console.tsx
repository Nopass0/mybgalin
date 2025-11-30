'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useConsole, HistoryEntry } from '@/hooks/useConsole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Terminal,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Activity,
  Clock,
  Play,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  FileText,
  Zap,
  ArrowUp,
  ArrowDown,
  Send,
  History,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ServerConsole() {
  const {
    systemInfo,
    processes,
    logs,
    services,
    commandHistory,
    isLoading,
    isExecuting,
    error,
    fetchSystemInfo,
    fetchProcesses,
    fetchLogs,
    fetchServices,
    executeCommand,
    clearHistory,
    clearError,
  } = useConsole();

  const [command, setCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedService, setSelectedService] = useState<string>('');
  const [logLines, setLogLines] = useState(100);
  const [copiedCommand, setCopiedCommand] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSystemInfo();
    fetchProcesses();
    fetchServices();
    fetchLogs(logLines);

    // Auto-refresh system info every 30 seconds
    const interval = setInterval(() => {
      fetchSystemInfo();
      fetchProcesses();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new command is added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commandHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isExecuting) return;

    await executeCommand(command);
    setCommand('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]?.command || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]?.command || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const quickCommands = [
    { label: 'Uptime', cmd: 'uptime' },
    { label: 'Disk Free', cmd: 'df -h' },
    { label: 'Memory', cmd: 'free -h' },
    { label: 'Top Processes', cmd: 'ps aux --sort=-%mem | head -10' },
    { label: 'Network', cmd: 'ip addr show' },
    { label: 'Ports', cmd: 'netstat -tlnp 2>/dev/null || ss -tlnp' },
    { label: 'Docker PS', cmd: 'docker ps 2>/dev/null || echo "Docker not available"' },
    { label: 'System Logs', cmd: 'journalctl -n 50 --no-pager 2>/dev/null || tail -50 /var/log/syslog' },
  ];

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedCommand(index);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Server className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="font-medium">Сервер</span>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  Online
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground truncate">{systemInfo?.hostname || '-'}</p>
                <p className="text-xs text-muted-foreground truncate">{systemInfo?.os || '-'}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Uptime: {systemInfo ? formatUptime(systemInfo.uptime_seconds) : '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Cpu className="h-5 w-5 text-green-500" />
                  </div>
                  <span className="font-medium">CPU</span>
                </div>
                <span className="text-sm">{systemInfo?.cpu_count || 0} cores</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Load Avg</span>
                  <span>{systemInfo?.load_average?.map(l => l.toFixed(2)).join(' / ') || '-'}</span>
                </div>
                <Progress
                  value={systemInfo?.load_average?.[0] ? (systemInfo.load_average[0] / systemInfo.cpu_count) * 100 : 0}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <MemoryStick className="h-5 w-5 text-purple-500" />
                  </div>
                  <span className="font-medium">RAM</span>
                </div>
                <span className="text-sm">{systemInfo?.memory?.usage_percent?.toFixed(0) || 0}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {((systemInfo?.memory?.used_mb || 0) / 1024).toFixed(1)} GB
                  </span>
                  <span className="text-muted-foreground">
                    {((systemInfo?.memory?.total_mb || 0) / 1024).toFixed(1)} GB
                  </span>
                </div>
                <Progress
                  value={systemInfo?.memory?.usage_percent || 0}
                  className={cn(
                    "h-2",
                    (systemInfo?.memory?.usage_percent || 0) > 80 && "bg-red-500/20"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <HardDrive className="h-5 w-5 text-orange-500" />
                  </div>
                  <span className="font-medium">Диск</span>
                </div>
                <span className="text-sm">{systemInfo?.disk?.usage_percent?.toFixed(0) || 0}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {systemInfo?.disk?.used_gb?.toFixed(1) || 0} GB
                  </span>
                  <span className="text-muted-foreground">
                    {systemInfo?.disk?.total_gb?.toFixed(1) || 0} GB
                  </span>
                </div>
                <Progress
                  value={systemInfo?.disk?.usage_percent || 0}
                  className={cn(
                    "h-2",
                    (systemInfo?.disk?.usage_percent || 0) > 90 && "bg-red-500/20"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="h-[600px] flex flex-col bg-[#1e1e1e] border-[#333]">
            <CardHeader className="pb-3 border-b border-[#333]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <CardTitle className="text-lg flex items-center gap-2 text-white">
                    <Terminal className="h-5 w-5" />
                    Консоль
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Очистить
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Quick Commands */}
            <div className="px-4 py-2 border-b border-[#333] flex flex-wrap gap-2 bg-[#252525]">
              {quickCommands.map((qc, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommand(qc.cmd)}
                  className="text-xs h-7 px-2 text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {qc.label}
                </Button>
              ))}
            </div>

            {/* Output */}
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full" ref={scrollRef}>
                <div className="p-4 font-mono text-sm space-y-4">
                  {commandHistory.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <Terminal className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Введите команду для начала работы</p>
                      <p className="text-xs mt-1">Используйте стрелки для навигации по истории</p>
                    </div>
                  ) : (
                    commandHistory.map((entry, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                      >
                        <div className="flex items-center gap-2 group">
                          <span className="text-green-400">$</span>
                          <span className="text-white flex-1">{entry.command}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-gray-500">
                              {entry.result.execution_time_ms}ms
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-500 hover:text-white"
                              onClick={() => copyToClipboard(entry.command, index)}
                            >
                              {copiedCommand === index ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {entry.result.success ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : entry.result.timed_out ? (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        {entry.result.stdout && (
                          <pre className="text-gray-300 whitespace-pre-wrap break-all pl-4 border-l-2 border-[#333]">
                            {entry.result.stdout}
                          </pre>
                        )}
                        {entry.result.stderr && (
                          <pre className="text-red-400 whitespace-pre-wrap break-all pl-4 border-l-2 border-red-500/50">
                            {entry.result.stderr}
                          </pre>
                        )}
                      </motion.div>
                    ))
                  )}
                  {isExecuting && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Выполняется...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-[#333] bg-[#252525]">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-green-400" />
                <Input
                  ref={inputRef}
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите команду..."
                  className="flex-1 font-mono bg-transparent border-none text-white placeholder:text-gray-500 focus-visible:ring-0"
                  disabled={isExecuting}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isExecuting || !command.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isExecuting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Side Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Tabs defaultValue="processes" className="h-[600px]">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="processes">
                    <Activity className="h-4 w-4 mr-1" />
                    Процессы
                  </TabsTrigger>
                  <TabsTrigger value="logs">
                    <FileText className="h-4 w-4 mr-1" />
                    Логи
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <TabsContent value="processes" className="h-full m-0">
                  <div className="p-4 pb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Top Processes</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={fetchProcesses}
                      disabled={isLoading}
                    >
                      <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100%-60px)] px-4 pb-4">
                    <div className="space-y-2">
                      {processes.map((proc, i) => (
                        <motion.div
                          key={proc.pid}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="p-3 rounded-lg bg-muted/50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate flex-1" title={proc.name}>
                              {proc.name.split(' ')[0]}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              PID {proc.pid}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Cpu className="h-3 w-3" />
                              {proc.cpu_percent.toFixed(1)}%
                            </div>
                            <div className="flex items-center gap-1">
                              <MemoryStick className="h-3 w-3" />
                              {proc.memory_mb.toFixed(0)} MB
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="logs" className="h-full m-0">
                  <div className="p-4 pb-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedService}
                        onValueChange={setSelectedService}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Все сервисы" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=" ">Все сервисы</SelectItem>
                          {services.map((svc) => (
                            <SelectItem key={svc} value={svc}>
                              {svc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchLogs(logLines, selectedService.trim() || undefined)}
                        disabled={isLoading}
                      >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                      </Button>
                    </div>
                    <Select
                      value={logLines.toString()}
                      onValueChange={(v) => setLogLines(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 строк</SelectItem>
                        <SelectItem value="100">100 строк</SelectItem>
                        <SelectItem value="200">200 строк</SelectItem>
                        <SelectItem value="500">500 строк</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ScrollArea className="h-[calc(100%-120px)] px-4 pb-4">
                    <div className="space-y-1 font-mono text-xs">
                      {logs?.logs.map((line, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-1 rounded",
                            line.toLowerCase().includes('error') && "bg-red-500/10 text-red-400",
                            line.toLowerCase().includes('warn') && "bg-yellow-500/10 text-yellow-400",
                          )}
                        >
                          {line}
                        </div>
                      ))}
                      {!logs?.logs.length && (
                        <div className="text-center text-muted-foreground py-8">
                          Нет логов для отображения
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </motion.div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm">{error}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
