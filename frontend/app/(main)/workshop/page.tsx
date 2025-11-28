"use client";

import { useEffect, useState } from "react";
import { WorkshopCard } from "@/components/workshop-card";
import { AlertCircle, PackageOpen, Loader2 } from "lucide-react";
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
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20 border border-white/10 p-8"
      >
        <div className="absolute inset-0 bg-[#0a0a0b]/50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <PackageOpen className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Steam Workshop</h1>
          <p className="text-white/60 text-lg">
            Мои работы в Steam Workshop
          </p>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
          <p className="text-white/60">Загрузка работ...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-1">Ошибка загрузки</h3>
              <p className="text-white/60">
                Не удалось загрузить данные Workshop: {error}
              </p>
              <p className="text-white/40 text-sm mt-2">
                Проверьте настройки STEAM_API_KEY и STEAM_ID в server/.env
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && workshopData && workshopData.total_items === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
            <PackageOpen className="w-12 h-12 text-white/20" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Нет работ в Workshop
          </h3>
          <p className="text-white/40 text-center">
            Пока нет опубликованных работ в Steam Workshop
          </p>
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
          {Object.entries(workshopData.by_game).map(
            ([gameKey, items], index) => (
              <motion.div
                key={gameKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                      <span>{GAME_NAMES[gameKey] || gameKey}</span>
                      <span className="text-sm font-normal px-2 py-0.5 bg-white/10 rounded-full text-white/60">
                        {items.length} {items.length === 1 ? "работа" : "работ"}
                      </span>
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {items.map((item) => (
                        <WorkshopCard
                          key={item.publishedfileid}
                          item={item}
                          gameName={gameKey}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ),
          )}
        </motion.div>
      )}
    </div>
  );
}
