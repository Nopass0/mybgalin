'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  User,
  Search,
  BarChart3,
  Tv,
  Link2,
  Settings,
  GraduationCap,
} from 'lucide-react';

const adminRoutes = [
  {
    label: 'Портфолио',
    icon: User,
    href: '/admin/portfolio',
  },
  {
    label: 'Поиск работы',
    icon: Search,
    href: '/admin/jobs',
  },
  {
    label: 'Статистика',
    icon: BarChart3,
    href: '/admin/stats',
  },
  {
    label: 'Аниме',
    icon: Tv,
    href: '/admin/anime',
  },
  {
    label: 'Ссылки',
    icon: Link2,
    href: '/admin/links',
  },
  {
    label: 'English',
    icon: GraduationCap,
    href: '/admin/english',
  },
  {
    label: 'Настройки меню',
    icon: Settings,
    href: '/admin/menu',
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 mb-6 p-1 bg-muted/50 rounded-lg">
      {adminRoutes.map((route) => {
        const isActive = pathname === route.href;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <route.icon className="h-4 w-4" />
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}
