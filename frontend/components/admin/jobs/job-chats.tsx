"use client";

import { useState } from "react";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle,
  Bot,
  User,
  ExternalLink,
  Send,
  ChevronRight,
  Building,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatWithMessages, JobChatMessage } from "@/lib/types";

export function JobChats() {
  const { chats, isLoading } = useJobs();
  const [selectedChat, setSelectedChat] = useState<ChatWithMessages | null>(null);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-500";
      case "negative":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getIntentBadge = (intent?: string) => {
    switch (intent) {
      case "invitation":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Приглашение</Badge>;
      case "question":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Вопрос</Badge>;
      case "rejection":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Отказ</Badge>;
      case "test":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Тест</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Список чатов */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
            Чаты
            {chats.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {chats.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-1 p-2">
              {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Пока нет чатов</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <motion.button
                    key={chat.chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors",
                      selectedChat?.chat.id === chat.chat.id
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    )}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          chat.chat.is_bot
                            ? "bg-amber-500/10"
                            : chat.chat.is_human_confirmed
                              ? "bg-green-500/10"
                              : "bg-muted"
                        )}
                      >
                        {chat.chat.is_bot ? (
                          <Bot className="h-5 w-5 text-amber-500" />
                        ) : (
                          <User className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {chat.vacancy_title}
                          </p>
                          {chat.chat.unread_count > 0 && (
                            <Badge variant="default" className="h-5 px-1.5 text-xs">
                              {chat.chat.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.company}
                        </p>
                        {chat.messages.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {chat.messages[chat.messages.length - 1].text.slice(0, 50)}...
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {chat.chat.is_bot && (
                        <Badge variant="outline" className="text-xs">
                          <Bot className="h-3 w-3 mr-1" />
                          Бот
                        </Badge>
                      )}
                      {chat.chat.telegram_invited && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500">
                          TG
                        </Badge>
                      )}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Переписка */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedChat ? (
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  {selectedChat.vacancy_title}
                </div>
              ) : (
                "Выберите чат"
              )}
            </CardTitle>
            {selectedChat && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://hh.ru/applicant/negotiations/${selectedChat.chat.hh_chat_id}`,
                    "_blank"
                  )
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Открыть на HH
              </Button>
            )}
          </div>
          {selectedChat && (
            <p className="text-sm text-muted-foreground">{selectedChat.company}</p>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            {!selectedChat ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-4 opacity-30" />
                <p>Выберите чат слева для просмотра переписки</p>
              </div>
            ) : selectedChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Send className="h-12 w-12 mb-4 opacity-30" />
                <p>Сообщений пока нет</p>
              </div>
            ) : (
              <div className="space-y-4 pr-4">
                <AnimatePresence>
                  {selectedChat.messages.map((message, index) => (
                    <MessageBubble key={message.id} message={message} index={index} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageBubble({ message, index }: { message: JobChatMessage; index: number }) {
  const isApplicant = message.author_type === "applicant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn("flex", isApplicant ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isApplicant
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <div
          className={cn(
            "flex items-center gap-2 mt-1",
            isApplicant ? "justify-end" : "justify-start"
          )}
        >
          <span
            className={cn(
              "text-xs",
              isApplicant ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {new Date(message.created_at).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {message.is_auto_response && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              <Bot className="h-2.5 w-2.5 mr-0.5" />
              Авто
            </Badge>
          )}
          {message.ai_intent && !isApplicant && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {message.ai_intent}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}
