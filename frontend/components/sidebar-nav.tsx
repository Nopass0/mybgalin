"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import {
  Home,
  FileText,
  Menu,
  PackageOpen,
  Palette,
  Sparkles,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// All available menu items - visibility controlled via admin settings
const allRoutes = [
  {
    id: "home",
    label: "Главная",
    icon: Home,
    href: "/",
    defaultVisible: true,
  },
  {
    id: "resume",
    label: "Резюме",
    icon: FileText,
    href: "/resume",
    defaultVisible: true,
  },
  {
    id: "workshop",
    label: "Steam Workshop",
    icon: PackageOpen,
    href: "/workshop",
    defaultVisible: true,
  },
  {
    id: "studio",
    label: "CS2 Skin Studio",
    icon: Palette,
    href: "/studio",
    isExternal: true,
    defaultVisible: true,
  },
  {
    id: "t2",
    label: "T2 Sales",
    icon: Store,
    href: "/t2",
    isExternal: true,
    defaultVisible: true,
  },
];

interface MenuSettings {
  [key: string]: boolean;
}

export function SidebarNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [menuSettings, setMenuSettings] = React.useState<MenuSettings>({});
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    // Load menu visibility settings
    const loadMenuSettings = async () => {
      try {
        const response = await fetch("/api/menu-settings");
        if (response.ok) {
          const data = await response.json();
          setMenuSettings(data);
        }
      } catch (error) {
        console.error("Failed to load menu settings:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadMenuSettings();
  }, []);

  // Filter routes based on visibility settings
  const routes = React.useMemo(() => {
    return allRoutes.filter((route) => {
      // If settings are loaded, use them; otherwise use defaults
      if (isLoaded && menuSettings[route.id] !== undefined) {
        return menuSettings[route.id];
      }
      return route.defaultVisible;
    });
  }, [menuSettings, isLoaded]);

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
