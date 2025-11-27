"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import {
  Home,
  FileText,
  Settings,
  Menu,
  ChevronDown,
  Briefcase,
  Search,
  BarChart3,
  User,
  Tv,
  PackageOpen,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "next-themes";

const routes = [
  {
    label: "Главная",
    icon: Home,
    href: "/",
  },
  {
    label: "Резюме",
    icon: FileText,
    href: "/resume",
  },
  {
    label: "Steam Workshop",
    icon: PackageOpen,
    href: "/workshop",
  },
  {
    label: "CS2 Skin Studio",
    icon: Palette,
    href: "/studio",
    isExternal: true,
  },
  {
    label: "Админка",
    icon: Settings,
    href: "/admin",
    submenu: [
      {
        label: "Портфолио",
        icon: User,
        href: "/admin/portfolio",
      },
      {
        label: "Поиск работы",
        icon: Search,
        href: "/admin/jobs",
      },
      {
        label: "Статистика",
        icon: BarChart3,
        href: "/admin/stats",
      },
      {
        label: "Аниме Аукцион",
        icon: Tv,
        href: "/admin/anime",
      },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [adminExpanded, setAdminExpanded] = React.useState(
    pathname.startsWith("/admin"),
  );
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    // Auto-expand admin menu if on admin page
    if (pathname.startsWith("/admin")) {
      setAdminExpanded(true);
    }
  }, [pathname]);

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-6">
        <Link href="/" className="flex items-center">
          {mounted && (
            <Image
              src="/logo.svg"
              alt="BGalin Logo"
              width={40}
              height={14}
              className={cn(
                "transition-all",
                theme === "dark"
                  ? "brightness-200 invert drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                  : "brightness-0",
              )}
              priority
            />
          )}
        </Link>
        <ThemeToggle />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {routes.map((route, index) => (
          <motion.div
            key={route.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {route.submenu ? (
              // Collapsible admin menu
              <div className="space-y-1">
                <button
                  onClick={() => setAdminExpanded(!adminExpanded)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent cursor-pointer",
                    pathname.startsWith("/admin")
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <route.icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{route.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      adminExpanded && "rotate-180",
                    )}
                  />
                </button>

                {/* Submenu */}
                <motion.div
                  initial={false}
                  animate={{
                    height: adminExpanded ? "auto" : 0,
                    opacity: adminExpanded ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-3 space-y-1 border-l-2 border-border pl-3 py-1">
                    {route.submenu.map((subRoute) => (
                      <Link
                        key={subRoute.href}
                        href={subRoute.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                          pathname === subRoute.href
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        <subRoute.icon className="h-4 w-4" />
                        {subRoute.label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              // Regular menu item
              <Link
                href={route.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                  pathname === route.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                <route.icon className="h-5 w-5" />
                {route.label}
              </Link>
            )}
          </motion.div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-40"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className={cn(
            "w-64 p-0",
            theme === "dark" &&
              "bg-background/40 backdrop-blur-xl border-white/10",
          )}
        >
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop */}
      <aside
        className={cn(
          "hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:w-64 md:flex-col md:border-r",
          mounted && theme === "dark"
            ? "bg-background/40 backdrop-blur-xl border-white/10"
            : "bg-background",
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
