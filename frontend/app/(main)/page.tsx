"use client";

import { motion } from "motion/react";
import { Code, Briefcase, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold tracking-tight">Добро пожаловать</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Это главная страница портфолио и системы автоматизированного поиска
          работы
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <Code className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Портфолио</CardTitle>
              <CardDescription>Просмотрите мои работы и опыт</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Перейдите в раздел "Резюме" чтобы увидеть подробную информацию о
                моем опыте работы, навыках и проектах.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <Briefcase className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Поиск работы</CardTitle>
              <CardDescription>
                Автоматизированная система поиска вакансий
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                В админке доступен функционал для настройки автоматического
                поиска и отклика на вакансии на HH.ru.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <Mail className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Админка</CardTitle>
              <CardDescription>
                Управление контентом и настройками
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Войдите в админку для редактирования портфолио, настройки поиска
                работы и управления системой.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="rounded-lg border bg-card p-6"
      >
        <h2 className="text-2xl font-semibold mb-4">О проекте</h2>
        <p className="text-muted-foreground">
          Это полнофункциональная система управления портфолио с интегрированным
          ботом для автоматического поиска работы на HeadHunter. Система
          позволяет управлять резюме, кейсами, навыками и контактами, а также
          автоматизировать процесс поиска и отклика на вакансии.
        </p>
      </motion.div>
    </div>
  );
}
