'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { usePortfolio } from '@/hooks/usePortfolio';
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
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

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

  const getContactIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'github':
        return <Github className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
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
        >
          <Card>
            <CardHeader>
              <CardTitle>О себе</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{portfolio.about}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Contacts */}
      {portfolio?.contacts && portfolio.contacts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Контакты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {portfolio.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-2">
                    {getContactIcon(contact.contact_type)}
                    <div className="flex-1">
                      {contact.label && (
                        <p className="text-xs text-muted-foreground">{contact.label}</p>
                      )}
                      <p className="text-sm">{contact.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Experience */}
      {portfolio?.experience && portfolio.experience.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Опыт работы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {portfolio.experience.map((exp, index) => (
                  <div key={exp.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold">{exp.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            {exp.company}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                          <Calendar className="h-4 w-4" />
                          {exp.date_from} — {exp.date_to || 'настоящее время'}
                        </div>
                      </div>
                      {exp.description && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Skills */}
      {portfolio?.skills && portfolio.skills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Навыки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(groupSkillsByCategory()).map(([category, skills]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold mb-2">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cases/Projects */}
      {portfolio?.cases && portfolio.cases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-4">Проекты</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {portfolio.cases.map((projectCase) => (
              <Card key={projectCase.id} className="overflow-hidden">
                {projectCase.main_image && (
                  <div className="relative h-48 w-full bg-muted">
                    <Image
                      src={projectCase.main_image}
                      alt={projectCase.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{projectCase.title}</CardTitle>
                  {projectCase.website_url && (
                    <CardDescription>
                      <a
                        href={projectCase.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        {projectCase.website_url}
                      </a>
                    </CardDescription>
                  )}
                </CardHeader>
                {projectCase.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {projectCase.description}
                    </p>
                    {projectCase.images && projectCase.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {projectCase.images.slice(0, 3).map((image, index) => (
                          <div key={index} className="relative h-20 rounded-md overflow-hidden bg-muted">
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
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
