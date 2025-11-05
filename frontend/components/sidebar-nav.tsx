"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import { Home, FileText, Briefcase, Settings, Menu, X } from "lucide-react";
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
    label: "Админка",
    icon: Settings,
    href: "/admin",
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-6">
        <Link href="/" className="flex items-center">
          {mounted && (
            <Image
              src="/logo.svg"
              alt="BGalin Logo"
              width={120}
              height={40}
              className={cn(
                "transition-all",
                theme === "dark" ? "brightness-200 invert-0" : "brightness-0",
              )}
              priority
            />
          )}
        </Link>
        <ThemeToggle />
      </div>
      <nav className="flex-1 space-y-2 px-3">
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                pathname === route.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <route.icon className="h-5 w-5" />
              {route.label}
            </Link>
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
        <SheetContent side="left" className="w-64 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:w-64 md:flex-col md:border-r md:bg-background">
        <NavContent />
      </aside>
    </>
  );
}
