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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

export default function ResumePage() {
  const { portfolio, isLoading, fetchPortfolio } = usePortfolio();

  useEffect(() => {
    fetchPortfolio();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      >
        <h1 className="text-4xl font-bold tracking-tight">Резюме</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Мой опыт работы, навыки и проекты
        </p>
      </motion.div>

      {/* About */}
      {portfolio?.about && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-semibold">О себе</h2>
          <div className="prose prose-base dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:leading-relaxed prose-p:my-3 prose-strong:font-semibold prose-strong:text-foreground prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1">
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
          className="space-y-3"
        >
          <h2 className="text-2xl font-semibold">Контакты</h2>
          <div className="flex flex-col gap-3">
            {portfolio.contacts.map((contact) => {
              const link = getContactLink(contact.contact_type, contact.value);
              const displayValue = formatContactValue(
                contact.contact_type,
                contact.value,
              );

              return (
                <div key={contact.id} className="flex items-center gap-3">
                  {getContactIcon(contact.contact_type)}
                  <div className="flex-1">
                    {contact.label && (
                      <p className="text-sm text-muted-foreground">
                        {contact.label}
                      </p>
                    )}
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base hover:underline hover:text-primary"
                      >
                        {displayValue}
                      </a>
                    ) : (
                      <p className="text-base">{displayValue}</p>
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
          className="space-y-4"
        >
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Опыт работы
          </h2>
          <div className="space-y-6">
            {portfolio.experience.map((exp, index) => (
              <div key={exp.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{exp.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-base text-muted-foreground">
                        <Building className="h-5 w-5" />
                        {exp.company}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-base text-muted-foreground whitespace-nowrap">
                      <Calendar className="h-5 w-5" />
                      {exp.date_from} — {exp.date_to || "настоящее время"}
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">
                      {exp.description}
                    </p>
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
          className="space-y-4"
        >
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Code className="h-6 w-6" />
            Навыки
          </h2>
          <div className="space-y-4">
            {Object.entries(groupSkillsByCategory()).map(
              ([category, skills]) => (
                <div key={category}>
                  <h4 className="text-base font-semibold mb-2">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm px-3 py-1"
                      >
                        {skill}
                      </Badge>
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
          className="space-y-4"
        >
          <h2 className="text-2xl font-semibold">Проекты</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {portfolio.cases.map((projectCase) => (
              <div key={projectCase.id} className="space-y-3">
                {projectCase.main_image && (
                  <div className="relative h-48 w-full bg-muted rounded-lg overflow-hidden">
                    <Image
                      src={projectCase.main_image}
                      alt={projectCase.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{projectCase.title}</h3>
                  {projectCase.website_url && (
                    <a
                      href={projectCase.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:underline hover:text-primary mt-1"
                    >
                      <Globe className="h-4 w-4" />
                      {projectCase.website_url}
                    </a>
                  )}
                </div>
                {projectCase.description && (
                  <div>
                    <p className="text-base text-muted-foreground whitespace-pre-wrap">
                      {projectCase.description}
                    </p>
                    {projectCase.images && projectCase.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {projectCase.images.slice(0, 3).map((image, index) => (
                          <div
                            key={index}
                            className="relative h-20 rounded-md overflow-hidden bg-muted"
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
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
