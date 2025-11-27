"use client";

import { useEffect, useState } from "react";
import { WorkshopCard } from "@/components/workshop-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, PackageOpen } from "lucide-react";
import { motion } from "motion/react";

interface WorkshopTag {
  tag: string;
}

interface WorkshopItem {
  publishedfileid: string;
  title: string;
  description: string;
  preview_url: string;
  time_created: number;
  time_updated: number;
  subscriptions: number;
  favorited: number;
  views: number;
  tags: WorkshopTag[];
  file_url?: string;
  file_size: number;
}

interface AllWorkshopItems {
  total_items: number;
  by_game: Record<string, WorkshopItem[]>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const GAME_NAMES: Record<string, string> = {
  cs2: "Counter-Strike 2",
  dota2: "Dota 2",
  tf2: "Team Fortress 2",
  gmod: "Garry's Mod",
  l4d2: "Left 4 Dead 2",
  wallpaperengine: "Wallpaper Engine",
};

export default function WorkshopPage() {
  const [workshopData, setWorkshopData] = useState<AllWorkshopItems | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkshopItems = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/workshop/all`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse<AllWorkshopItems> = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to fetch workshop items");
        }

        setWorkshopData(result.data);
      } catch (err) {
        console.error("Error fetching workshop items:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshopItems();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <PackageOpen className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Steam Workshop</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Мои работы в Steam Workshop
        </p>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-background/40">
              <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="space-y-3">
                      <Skeleton className="aspect-video w-full" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Alert
            variant="destructive"
            className="backdrop-blur-xl bg-background/40 border-red-500/50"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка загрузки</AlertTitle>
            <AlertDescription>
              Не удалось загрузить данные Workshop: {error}
              <br />
              <span className="text-sm mt-2 block">
                Проверьте настройки STEAM_API_KEY и STEAM_ID в server/.env
              </span>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && workshopData && workshopData.total_items === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="backdrop-blur-xl bg-background/40 border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Нет работ в Workshop
              </h3>
              <p className="text-muted-foreground text-center">
                Пока нет опубликованных работ в Steam Workshop
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Workshop Items by Game */}
      {!loading && !error && workshopData && workshopData.total_items > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8"
        >
          {/* Summary Card removed */}

          {/* Items by Game */}
          {Object.entries(workshopData.by_game).map(
            ([gameKey, items], index) => (
              <motion.div
                key={gameKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Card className="backdrop-blur-xl bg-background/40 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>{GAME_NAMES[gameKey] || gameKey}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        ({items.length}{" "}
                        {items.length === 1 ? "работа" : "работ"})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {items.map((item) => (
                        <WorkshopCard
                          key={item.publishedfileid}
                          item={item}
                          gameName={gameKey}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ),
          )}
        </motion.div>
      )}
    </div>
  );
}
