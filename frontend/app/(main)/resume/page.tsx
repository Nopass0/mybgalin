"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { usePortfolio } from "@/hooks/usePortfolio";
import {
  Briefcase,
  Code,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  Calendar,
  Building,
  Loader2,
  Send,
  FileText,
  User,
} from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

export default function ResumePage() {
  const { portfolio, isLoading, fetchPortfolio } = usePortfolio();

  useEffect(() => {
    fetchPortfolio();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
        <p className="text-white/60">Загрузка резюме...</p>
      </div>
    );
  }

  const getContactIcon = (type: string | undefined) => {
    if (!type) return <Mail className="h-4 w-4" />;

    switch (type.toLowerCase()) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "telegram":
        return <Send className="h-4 w-4" />;
      case "website":
        return <Globe className="h-4 w-4" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4" />;
      case "github":
        return <Github className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const formatContactValue = (type: string | undefined, value: string) => {
    if (type?.toLowerCase() === "telegram") {
      const username = value.startsWith("@") ? value.slice(1) : value;
      return `@${username}`;
    }
    return value;
  };

  const getContactLink = (type: string | undefined, value: string) => {
    if (!type) return null;

    switch (type.toLowerCase()) {
      case "email":
        return `mailto:${value}`;
      case "phone":
        return `tel:${value}`;
      case "telegram":
        const username = value.startsWith("@") ? value.slice(1) : value;
        return `https://t.me/${username}`;
      case "website":
      case "linkedin":
      case "github":
        return value.startsWith("http") ? value : `https://${value}`;
      default:
        return null;
    }
  };

  const groupSkillsByCategory = () => {
    const grouped: Record<string, string[]> = {};
    portfolio?.skills.forEach((skill) => {
      if (!grouped[skill.category]) {
        grouped[skill.category] = [];
      }
      grouped[skill.category].push(skill.name);
    });
    return grouped;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 via-transparent to-cyan-500/20 border border-white/10 p-8"
      >
        <div className="absolute inset-0 bg-[#0a0a0b]/50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-cyan-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Резюме</h1>
          <p className="text-lg text-white/60">
            Мой опыт работы, навыки и проекты
          </p>
        </div>
      </motion.div>

      {/* About */}
      {portfolio?.about && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">О себе</h2>
          </div>
          <div className="prose prose-base prose-invert max-w-none text-white/70 prose-headings:text-white prose-strong:text-white prose-a:text-orange-400">
            <ReactMarkdown>{portfolio.about}</ReactMarkdown>
          </div>
        </motion.div>
      )}

      {/* Contacts */}
      {portfolio?.contacts && portfolio.contacts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Контакты</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {portfolio.contacts.map((contact) => {
              const link = getContactLink(contact.contact_type, contact.value);
              const displayValue = formatContactValue(
                contact.contact_type,
                contact.value,
              );

              return (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/10"
                >
                  <div className="text-white/40">
                    {getContactIcon(contact.contact_type)}
                  </div>
                  <div>
                    {contact.label && (
                      <p className="text-xs text-white/40">{contact.label}</p>
                    )}
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white hover:text-orange-400 transition-colors"
                      >
                        {displayValue}
                      </a>
                    ) : (
                      <p className="text-sm text-white">{displayValue}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Experience */}
      {portfolio?.experience && portfolio.experience.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Опыт работы</h2>
          </div>
          <div className="space-y-6">
            {portfolio.experience.map((exp, index) => (
              <div key={exp.id}>
                {index > 0 && <div className="border-t border-white/10 my-6" />}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white">{exp.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-white/60">
                        <Building className="h-4 w-4" />
                        <span>{exp.company}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/40 whitespace-nowrap">
                      <Calendar className="h-4 w-4" />
                      <span>{exp.date_from} — {exp.date_to || "настоящее время"}</span>
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-white/60 whitespace-pre-wrap">{exp.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Skills */}
      {portfolio?.skills && portfolio.skills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Code className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Навыки</h2>
          </div>
          <div className="space-y-6">
            {Object.entries(groupSkillsByCategory()).map(
              ([category, skills]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </motion.div>
      )}

      {/* Cases/Projects */}
      {portfolio?.cases && portfolio.cases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-semibold text-white">Проекты</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {portfolio.cases.map((projectCase) => (
              <div
                key={projectCase.id}
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
              >
                {projectCase.main_image && (
                  <div className="relative h-48 w-full bg-[#121214]">
                    <Image
                      src={projectCase.main_image}
                      alt={projectCase.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-white">{projectCase.title}</h3>
                  {projectCase.website_url && (
                    <a
                      href={projectCase.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-white/40 hover:text-orange-400 transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      {projectCase.website_url}
                    </a>
                  )}
                  {projectCase.description && (
                    <p className="text-sm text-white/60 whitespace-pre-wrap">
                      {projectCase.description}
                    </p>
                  )}
                  {projectCase.images && projectCase.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {projectCase.images.slice(0, 3).map((image, index) => (
                        <div
                          key={index}
                          className="relative h-16 rounded-md overflow-hidden bg-[#121214]"
                        >
                          <Image
                            src={image}
                            alt={`${projectCase.title} ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
