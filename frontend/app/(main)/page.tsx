"use client";

import { motion } from "motion/react";
import { Code, Briefcase, Mail, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const cards = [
    {
      icon: Code,
      title: "Портфолио",
      description: "Просмотрите мои работы и опыт",
      content: "Перейдите в раздел \"Резюме\" чтобы увидеть подробную информацию о моем опыте работы, навыках и проектах.",
      href: "/resume",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Briefcase,
      title: "Поиск работы",
      description: "Автоматизированная система поиска вакансий",
      content: "В админке доступен функционал для настройки автоматического поиска и отклика на вакансии на HH.ru.",
      href: "/admin/jobs",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Mail,
      title: "Админка",
      description: "Управление контентом и настройками",
      content: "Войдите в админку для редактирования портфолио, настройки поиска работы и управления системой.",
      href: "/admin",
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/20 via-transparent to-purple-500/20 border border-white/10 p-8"
      >
        <div className="absolute inset-0 bg-[#0a0a0b]/50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Добро пожаловать
          </h1>
          <p className="text-lg text-white/60 max-w-2xl">
            Это главная страница портфолио и системы автоматизированного поиска работы
          </p>
        </div>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
          >
            <Link href={card.href}>
              <div className="group relative h-full bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden">
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1">{card.title}</h3>
                  <p className="text-white/40 text-sm mb-3">{card.description}</p>
                  <p className="text-white/60 text-sm mb-4">{card.content}</p>

                  <div className="flex items-center gap-2 text-white/40 group-hover:text-white/60 transition-colors">
                    <span className="text-sm">Перейти</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* About Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white/5 rounded-xl border border-white/10 p-6"
      >
        <h2 className="text-2xl font-semibold text-white mb-4">О проекте</h2>
        <p className="text-white/60 leading-relaxed">
          Это полнофункциональная система управления портфолио с интегрированным
          ботом для автоматического поиска работы на HeadHunter. Система
          позволяет управлять резюме, кейсами, навыками и контактами, а также
          автоматизировать процесс поиска и отклика на вакансии.
        </p>
      </motion.div>
    </div>
  );
}
