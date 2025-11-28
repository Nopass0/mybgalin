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
  Link2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
      {
        label: "Сократитель ссылок",
        icon: Link2,
        href: "/admin/links",
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

  React.useEffect(() => {
    // Auto-expand admin menu if on admin page
    if (pathname.startsWith("/admin")) {
      setAdminExpanded(true);
    }
  }, [pathname]);

  const NavContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="flex items-center gap-3 p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">BGalin</h1>
            <p className="text-xs text-white/40">Portfolio</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
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
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-white/5 cursor-pointer",
                    pathname.startsWith("/admin")
                      ? "bg-white/10 text-white"
                      : "text-white/60",
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
                  <div className="ml-3 space-y-1 border-l-2 border-white/10 pl-3 py-1">
                    {route.submenu.map((subRoute) => (
                      <Link
                        key={subRoute.href}
                        href={subRoute.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-white/5",
                          pathname === subRoute.href
                            ? "bg-orange-500/20 text-orange-400"
                            : "text-white/60",
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-white/5",
                  pathname === route.href
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-white/60",
                )}
              >
                <route.icon className="h-5 w-5" />
                {route.label}
              </Link>
            )}
          </motion.div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/30 text-center">
          © 2024 BGalin
        </p>
      </div>
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
            className="fixed left-4 top-4 z-40 bg-white/5 hover:bg-white/10 text-white border border-white/10"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-[#0a0a0b] border-white/10"
        >
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:w-64 md:flex-col md:border-r bg-[#0a0a0b]/80 backdrop-blur-xl border-white/10">
        <NavContent />
      </aside>
    </>
  );
}
