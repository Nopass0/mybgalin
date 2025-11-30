"use client";

import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Search, Send, MessageCircle, PartyPopper, XCircle, Bot, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobActivityFeedProps {
  fullPage?: boolean;
}

export function JobActivityFeed({ fullPage = false }: JobActivityFeedProps) {
  const { activity } = useJobs();

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "search":
        return <Search className="h-4 w-4" />;
      case "apply":
        return <Send className="h-4 w-4" />;
      case "chat":
        return <MessageCircle className="h-4 w-4" />;
      case "response":
        return <TrendingUp className="h-4 w-4" />;
      case "invite":
        return <PartyPopper className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      case "ai":
        return <Bot className="h-4 w-4" />;
      case "system":
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "search":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "apply":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "chat":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "response":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "invite":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "ai":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "system":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "только что";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const displayActivity = fullPage ? activity : activity.slice(0, 10);

  return (
    <Card className={cn(fullPage ? "min-h-[600px]" : "h-[400px]")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Лента активности
          {activity.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activity.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={cn(fullPage ? "h-[520px]" : "h-[320px]")}>
          <div className="space-y-1 px-4 pb-4">
            <AnimatePresence mode="popLayout">
              {displayActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Пока нет событий</p>
                </div>
              ) : (
                displayActivity.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border shrink-0",
                        getEventColor(item.event_type)
                      )}
                    >
                      {getEventIcon(item.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{item.description}</p>
                      {(item.vacancy_title || item.company) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.vacancy_title}
                          {item.company && ` — ${item.company}`}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatTime(item.created_at)}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
