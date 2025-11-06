"use client";

import { useEffect, useState, useRef } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import {
  Loader2,
  User,
  Mail,
  Briefcase,
  Award,
  FolderOpen,
} from "lucide-react";
import { AboutEditor } from "./portfolio/about-editor";
import { ExperienceEditor } from "./portfolio/experience-editor";
import { SkillsEditor } from "./portfolio/skills-editor";
import { ContactsEditor } from "./portfolio/contacts-editor";
import { CasesEditor } from "./portfolio/cases-editor";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const sections = [
  { id: "about", label: "О себе", icon: User },
  { id: "contacts", label: "Контакты", icon: Mail },
  { id: "experience", label: "Опыт работы", icon: Briefcase },
  { id: "skills", label: "Навыки", icon: Award },
  { id: "cases", label: "Проекты", icon: FolderOpen },
];

export function PortfolioManager() {
  const { portfolio, isLoading, fetchPortfolio } = usePortfolio();
  const [activeSection, setActiveSection] = useState("about");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const { theme } = useTheme();

  useEffect(() => {
    fetchPortfolio();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
      },
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [portfolio]);

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
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
    <div className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1 space-y-12">
        <section
          id="about"
          ref={(el) => {
            sectionRefs.current.about = el;
          }}
          className="scroll-mt-24"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">О себе</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Расскажите о себе, своих целях и профессиональной биографии
            </p>
          </div>
          <AboutEditor about={portfolio?.about} />
        </section>

        <section
          id="contacts"
          ref={(el) => {
            sectionRefs.current.contacts = el;
          }}
          className="scroll-mt-24"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Контакты</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Укажите способы связи: email, телефон, социальные сети
            </p>
          </div>
          <ContactsEditor contacts={portfolio?.contacts || []} />
        </section>

        <section
          id="experience"
          ref={(el) => {
            sectionRefs.current.experience = el;
          }}
          className="scroll-mt-24"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Опыт работы</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Добавьте информацию о местах работы и достижениях
            </p>
          </div>
          <ExperienceEditor experience={portfolio?.experience || []} />
        </section>

        <section
          id="skills"
          ref={(el) => {
            sectionRefs.current.skills = el;
          }}
          className="scroll-mt-24"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Навыки</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Перечислите ваши профессиональные навыки и технологии
            </p>
          </div>
          <SkillsEditor skills={portfolio?.skills || []} />
        </section>

        <section
          id="cases"
          ref={(el) => {
            sectionRefs.current.cases = el;
          }}
          className="scroll-mt-24"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Проекты</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Опишите ваши проекты и реализованные кейсы
            </p>
          </div>
          <CasesEditor cases={portfolio?.cases || []} />
        </section>
      </div>

      {/* Sticky Navigation */}
      <nav className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 space-y-1">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground px-3">
            Разделы
          </h3>
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  theme === "dark" &&
                    isActive &&
                    "shadow-[0_0_12px_rgba(255,255,255,0.1)]",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    theme === "dark" &&
                      isActive &&
                      "drop-shadow-[0_0_6px_rgba(150,150,150,0.5)]",
                  )}
                />
                <span>{section.label}</span>
                {section.id === "about" && portfolio?.about && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />
                )}
                {section.id === "contacts" &&
                  portfolio?.contacts &&
                  portfolio.contacts.length > 0 && (
                    <span className="ml-auto text-xs">
                      {portfolio.contacts.length}
                    </span>
                  )}
                {section.id === "experience" &&
                  portfolio?.experience &&
                  portfolio.experience.length > 0 && (
                    <span className="ml-auto text-xs">
                      {portfolio.experience.length}
                    </span>
                  )}
                {section.id === "skills" &&
                  portfolio?.skills &&
                  portfolio.skills.length > 0 && (
                    <span className="ml-auto text-xs">
                      {portfolio.skills.length}
                    </span>
                  )}
                {section.id === "cases" &&
                  portfolio?.cases &&
                  portfolio.cases.length > 0 && (
                    <span className="ml-auto text-xs">
                      {portfolio.cases.length}
                    </span>
                  )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
