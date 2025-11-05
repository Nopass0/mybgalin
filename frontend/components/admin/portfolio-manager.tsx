'use client';

import { useEffect, useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { AboutEditor } from './portfolio/about-editor';
import { ExperienceEditor } from './portfolio/experience-editor';
import { SkillsEditor } from './portfolio/skills-editor';
import { ContactsEditor } from './portfolio/contacts-editor';
import { CasesEditor } from './portfolio/cases-editor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function PortfolioManager() {
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

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="about" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-semibold">О себе</span>
              {portfolio?.about && (
                <span className="text-xs text-muted-foreground">(заполнено)</span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <AboutEditor about={portfolio?.about} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="contacts" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Контакты</span>
              {portfolio?.contacts && portfolio.contacts.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({portfolio.contacts.length})
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <ContactsEditor contacts={portfolio?.contacts || []} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="experience" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Опыт работы</span>
              {portfolio?.experience && portfolio.experience.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({portfolio.experience.length})
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <ExperienceEditor experience={portfolio?.experience || []} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Навыки</span>
              {portfolio?.skills && portfolio.skills.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({portfolio.skills.length})
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <SkillsEditor skills={portfolio?.skills || []} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cases" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Кейсы / Проекты</span>
              {portfolio?.cases && portfolio.cases.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({portfolio.cases.length})
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <CasesEditor cases={portfolio?.cases || []} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
